import { ESettingsKey } from 'shared';
import { spawn } from 'node:child_process';
import { PRELOAD_PATH } from '~/constants';
import { CliService } from '~/services/cli';
import { IpcService } from '~/services/ipc';
import { YtdlpService } from '~/services/ytdlp';
import { OnlineChecker } from './onlineChecker';
import { WindowService } from '~/services/window';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import { SettingsService } from '~/services/settings';
import { BinaryDownloader } from './binaryDownloader';
import { app, shell, dialog, BrowserWindow } from 'electron';
import { fileExists, getExtraFilePath, CancellationTokenSource, OperationCancelledError } from '~/common';
import type { Maybe } from 'shared';
import type { IBootstrappable } from '~/common';

@injectable()
export class SetupService implements IBootstrappable {
	private finished = false;
	private setupWindow: Maybe<BrowserWindow>;
	private readonly cts = new CancellationTokenSource();

	public constructor(
		private readonly logger        = inject(LoggingService),
		private readonly cli           = inject(CliService),
		private readonly ipc           = inject(IpcService),
		private readonly window        = inject(WindowService),
		private readonly settings      = inject(SettingsService),
		private readonly downloader    = inject(BinaryDownloader),
		private readonly onlineChecker = inject(OnlineChecker),
		private readonly ytdlp         = inject(YtdlpService),
	) {
		this.ipc.registerHandler('setup<-cancel', () => this.cancel());
	}

	public async bootstrap() {
		await this.performSetupActions();
	}

	public cancel() {
		this.emitStep('Cancelling...');
		this.cts.cancel();
	}

	private async performSetupActions() {
		await this.showWindow();
		await this.setDefaultSettings();
		await this.settings.migrateLegacySettings();
		await this.settings.removeDeprecatedSettings();
		await this.checkIfOnline();
		await this.checkForBinaries();
		await this.updateYtdlp();

		this.emitStep('Done!');
		this.setupWindow!.setProgressBar(1, { mode: 'none' });
		this.finished = true;
	}

	private async setDefaultSettings() {
		this.logger.debug('Setting default settings');

		await this.settings.setDefaults([
			[ESettingsKey.YtdlpPath, 'yt-dlp'],
			[ESettingsKey.DownloadDir, app.getPath('downloads')],
			[ESettingsKey.DownloadNameTemplate, '%(title)s [%(id)s].%(ext)s'],
			[ESettingsKey.SkipYoutubePlaylists, true],
			[ESettingsKey.DefaultDownloadAction, 'video'],
			[ESettingsKey.EnableGlobalMenu, false],
			[ESettingsKey.EnableDownloadCompletionToast, true],
			[ESettingsKey.UseThumbnailForCoverArt, false],
			[ESettingsKey.EnableNewReleaseToast, true],
			[ESettingsKey.ShowHintFooter, true],
			[ESettingsKey.HideSetupWindow, false],
			[ESettingsKey.DisableHardwareAcceleration, false],
			[ESettingsKey.UpdateYtdlpOnStartup, true],
		]);
	}

	private async showWindow() {
		const { promise, resolve } = Promise.withResolvers<void>();
		this.setupWindow = this.window.createWindow('setup', {
			url: this.window.useRendererRouter('setup'),
			browserWindowOptions: {
				show: false,
				width: 450,
				height: 350,
				titleBarStyle: 'hidden',
				resizable: false,
				maximizable: false,
				backgroundColor: '#000',
				webPreferences: {
					spellcheck: false,
					enableWebSQL: false,
					nodeIntegration: true,
					devTools: import.meta.env.DEV,
					preload: PRELOAD_PATH,
				}
			},
			onReadyToShow: async () => {
				const hideSetupWindow =  this.settings.get<boolean>(ESettingsKey.HideSetupWindow);
				if (!hideSetupWindow || this.cli.flags.updateBinaries) {
					this.setupWindow!.show();
				}

				resolve();
			}
		});

		this.setupWindow.once('close', () => {
			if (!this.finished) {
				this.cancel();
			}
		});

		const interval = setInterval(() => {
			if (this.cts.isCancellationRequested) {
				app.exit(0);
				clearInterval(interval);
			} else if (this.finished) {
				this.setupWindow!.closable = true;
				this.setupWindow!.close();
				clearInterval(interval);
			}
		}, 500);

		return promise;
	}

	private async checkForBinaries() {
		this.setupWindow!.setProgressBar(1, { mode: 'indeterminate' });

		this.emitStep('Checking for yt-dlp...');

		const token           = this.cts.token;
		const signal          = token.toAbortSignal();
		const ytdlpPath       = getExtraFilePath('yt-dlp.exe');
		const ffmpegPath      = getExtraFilePath('ffmpeg.exe');
		const ffprobePath     = getExtraFilePath('ffprobe.exe');
		const mainWindow      = this.window.getMainWindow()!;
		const hideSetupWindow = this.settings.get<boolean>(ESettingsKey.HideSetupWindow);

		const hasYtdlp = await this.hasYtdlpBinary(ytdlpPath);

		this.emitStep('Checking for FFmpeg...');

		const hasFfmpeg = await Promise.all([
			fileExists(ffmpegPath),
			fileExists(ffprobePath)
		]).then(r => r.every(Boolean));

		if (!hasYtdlp || !hasFfmpeg) {
			if (hideSetupWindow) {
				this.setupWindow!.show();
			}

			const missingDependencies = [];

			if (!hasYtdlp) missingDependencies.push('yt-dlp');
			if (!hasFfmpeg) missingDependencies.push('FFmpeg');
			if (!this.cli.flags.updateBinaries) {
				const res = await dialog.showMessageBox(mainWindow, {
					type: 'info',
					message: `yay needs to download the following files to operate:\n\n${missingDependencies.join('\n')}\n\nWould you like to continue?`,
					buttons: ['Yes', 'No'],
					defaultId: 0
				});
				if (res.response !== 0) {
					app.exit(0);
					return;
				}
			}
		}

		if (!hasYtdlp && !this.cts.isCancellationRequested) {
			this.emitStep('Starting yt-dlp download...');

			try {
				await this.downloader.downloadYtdlpBinary(
					ytdlpPath,
					signal,
					progress => {
						this.emitStep(`Downloading yt-dlp... (${progress}%)`);
						this.setupWindow!.setProgressBar(progress / 100, { mode: 'normal' });
					}
				);

				await this.settings.set(ESettingsKey.YtdlpPath, ytdlpPath);
			} catch (err) {
				if (!(err instanceof OperationCancelledError)) {
					const res = await dialog.showMessageBox(mainWindow, {
						type: 'error',
						message: `There was an issue downloading the latest release of yt-dlp.\nYou can try to manually download the latest release and place the file into the same folder as yay.exe\n\nWould you like to continue to the download?`,
						buttons: ['Yes', 'No'],
						defaultId: 0
					});

					if (res.response === 0) {
						await shell.openExternal('https://github.com/yt-dlp/yt-dlp/releases/download/latest/yt-dlp.exe')
					} else {
						app.exit(0);
						return;
					}
				}
			}
		}

		if (!hasFfmpeg && !this.cts.isCancellationRequested) {
			this.emitStep('Starting FFmpeg download...');

			try {
				await this.downloader.downloadFfmpegBinary(
					ffmpegPath,
					signal,
					progress => {
						this.emitStep(`Downloading FFmpeg... (${progress}%)`);
						this.setupWindow!.setProgressBar(progress / 100, { mode: 'normal' });
					},
					() => {
						this.emitStep('Extracting FFmpeg...');
						this.setupWindow!.setProgressBar(1, { mode: 'indeterminate' });
					},
					() => this.emitStep('Finalizing...')
				);
			} catch (err) {
				if (!(err instanceof OperationCancelledError)) {
					const res = await dialog.showMessageBox(mainWindow, {
						type: 'error',
						message: `There was an issue downloading the latest release of FFmpeg.\nYou can try to manually download the latest release and extract the files into the same folder as yay.exe\n\nWould you like to continue?`,
						buttons: ['Yes', 'No'],
						checkboxLabel: 'Open latest release page?',
						checkboxChecked: false,
						defaultId: 0
					});

					if (res.checkboxChecked) {
						await shell.openExternal('https://github.com/yt-dlp/FFmpeg-Builds/releases/latest')
					}

					if (res.response !== 0) {
						app.exit(0);
						return;
					}
				}
			}
		}

		if (this.cts.isCancellationRequested) {
			this.setupWindow!.setProgressBar(1, { mode: 'error' });
		}
	}

	private async hasYtdlpBinary(localPath: string): Promise<boolean> {
		this.logger.info('Checking for yt-dlp binary');

		const currentPath       = this.settings.get(ESettingsKey.YtdlpPath);
		const localBinaryExists = await fileExists(localPath);
		if (localBinaryExists) {
			this.logger.info('Found yt-dlp binary', { path: localPath });

			if (currentPath !== localPath) {
				await this.settings.set(ESettingsKey.YtdlpPath, localPath);
			}

			return true;
		}

		if (currentPath === 'yt-dlp') {
			this.logger.info('Verifying yt-dlp binary in PATH');

			try {
				const isValid = await this.verifyYtdlpBinary('yt-dlp');
				if (isValid) {
					this.logger.debug('PATH yt-dlp binary is valid');
					return true;
				}
			} catch (err) {
				this.logger.error('PATH yt-dlp binary no longer works', { err });
			}
		}

		return false;
	}

	private verifyYtdlpBinary(binaryPath: string): Promise<boolean> {
		const versionPattern               = /\d{4}\.\d+\.\d+/;
		const { resolve, reject, promise } = Promise.withResolvers<boolean>();

		let output = '';
		const proc = spawn(binaryPath, ['--version']);
		proc.stdout.on('data', data => output += data.toString());
		proc.once('error', err => reject(err));
		proc.once('close', () => {
			const matches = versionPattern.exec(output.trim());
			if (matches) {
				this.logger.debug('PATH yt-dlp binary is verified', { version: matches[0] });
				resolve(true);
			} else {
				reject(new Error('Version pattern not found in output'));
			}
		});

		return promise;
	}

	private async checkIfOnline() {
		const isOnline = await this.onlineChecker.checkIfOnline();
		if (isOnline) {
			return;
		}

		const mainWindow = this.window.getMainWindow()!;
		const res = await dialog.showMessageBox(mainWindow, {
			type: 'warning',
			message: 'It appears that you have no internet connection.\nThis application cannot function without an internet connection.\n\nWould you still like to continue?',
			buttons: ['Yes', 'No'],
			defaultId: 0
		});
		if (res.response !== 0) {
			app.exit(0);
		}
	}

	private async updateYtdlp() {
		if (this.settings.get(ESettingsKey.UpdateYtdlpOnStartup, true)) {
			this.setupWindow!.setProgressBar(1, { mode: 'indeterminate' });
			this.emitStep('Checking for yt-dlp updates...');
			await this.ytdlp.updateBinary(true);
		}
	}

	private emitStep(message: string) {
		this.window.emit('setup', 'setup->step', { message });
	}
}
