import { spawn } from 'node:child_process';
import { PRELOAD_PATH } from '~/constants';
import { CliService } from '~/services/cli';
import { IpcService } from '~/services/ipc';
import { app, shell, dialog } from 'electron';
import { OnlineChecker } from './onlineChecker';
import { IpcChannel, SettingsKey } from 'shared';
import { WindowService } from '~/services/window';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import { SettingsService } from '~/services/settings';
import { BinaryDownloader } from './binaryDownloader';
import { fileExists, getExtraFilePath } from '~/utils';
import { CancellationTokenSource, OperationCancelledError } from '~/common/cancellation';
import type { IBootstrappable } from '~/common/IBootstrappable';

@injectable()
export class SetupService implements IBootstrappable {
	private finished = false;
	private readonly cts = new CancellationTokenSource();

	public constructor(
		private readonly logger        = inject(LoggingService),
		private readonly cli           = inject(CliService),
		private readonly ipc           = inject(IpcService),
		private readonly window        = inject(WindowService),
		private readonly settings      = inject(SettingsService),
		private readonly downloader    = inject(BinaryDownloader),
		private readonly onlineChecker = inject(OnlineChecker),
	) {
		this.ipc.registerHandler(IpcChannel.Setup_Cancel, () => this.cancel());
	}

	public async bootstrap() {
		await this.performSetupActions();
	}

	public cancel() {
		this.window.emit('setup', IpcChannel.Setup_Step, 'Cancelling...');
		this.cts.cancel();
	}

	private async performSetupActions() {
		await this.setDefaultSettings();
		await this.settings.migrateLegacySettings();
		await this.settings.removeDeprecatedSettings();
		await this.checkIfOnline();
		await this.checkForBinaries();
	}

	private async setDefaultSettings() {
		this.logger.debug('Setting default settings');

		await this.settings.setDefault(SettingsKey.YtdlpPath, 'yt-dlp');
		await this.settings.setDefault(SettingsKey.DownloadDir, app.getPath('downloads'));
		await this.settings.setDefault(SettingsKey.DownloadNameTemplate, '%(title)s [%(id)s].%(ext)s');
		await this.settings.setDefault(SettingsKey.SkipYoutubePlaylists, true);
		await this.settings.setDefault(SettingsKey.DefaultDownloadAction, 'video');
		await this.settings.setDefault(SettingsKey.EnableGlobalMenu, false);
		await this.settings.setDefault(SettingsKey.EnableDownloadCompletionToast, true);
		await this.settings.setDefault(SettingsKey.UseThumbnailForCoverArt, false);
		await this.settings.setDefault(SettingsKey.EnableNewReleaseToast, true);
		await this.settings.setDefault(SettingsKey.ShowHintFooter, true);
		await this.settings.setDefault(SettingsKey.HideSetupWindow, false);
		await this.settings.setDefault(SettingsKey.DisableHardwareAcceleration, false);
	}

	private async checkForBinaries() {
		const token       = this.cts.token;
		const signal      = token.toAbortSignal();
		const ytdlpPath   = getExtraFilePath('yt-dlp.exe');
		const ffmpegPath  = getExtraFilePath('ffmpeg.exe');
		const ffprobePath = getExtraFilePath('ffprobe.exe');

		const mainWindow = this.window.getMainWindow()!;

		const setupWindow = this.window.createWindow('setup', {
			url: this.window.resolveRendererHTML('setup.html'),
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
				const hideSetupWindow =  this.settings.get<boolean>(SettingsKey.HideSetupWindow);
				if (!hideSetupWindow || this.cli.flags.updateBinaries) {
					setupWindow.show();
				}

				setupWindow.setProgressBar(1, { mode: 'indeterminate' });

				this.window.emit('setup', IpcChannel.Setup_Step, 'Checking for yt-dlp...');

				const hasYtdlp = await this.hasYtdlpBinary(ytdlpPath);

				this.window.emit('setup', IpcChannel.Setup_Step, 'Checking for FFmpeg...');

				const hasFfmpeg = await Promise.all([
					fileExists(ffmpegPath),
					fileExists(ffprobePath)
				]).then(r => r.every(Boolean));

				if (!hasYtdlp || !hasFfmpeg) {
					if (hideSetupWindow) {
						setupWindow.show();
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
					this.window.emit('setup', IpcChannel.Setup_Step, 'Starting yt-dlp download...');

					try {
						await this.downloader.downloadYtdlpBinary(
							ytdlpPath,
							signal,
							progress => {
								this.window.emit('setup', IpcChannel.Setup_Step, `Downloading yt-dlp... (${progress}%)`);
								setupWindow.setProgressBar(progress / 100, { mode: 'normal' });
							}
						);

						await this.settings.set(SettingsKey.YtdlpPath, ytdlpPath);
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
					this.window.emit('setup', IpcChannel.Setup_Step, 'Starting FFmpeg download...');

					try {
						await this.downloader.downloadFfmpegBinary(
							ffmpegPath,
							signal,
							progress => {
								this.window.emit('setup', IpcChannel.Setup_Step, `Downloading FFmpeg... (${progress}%)`);
								setupWindow.setProgressBar(progress / 100, { mode: 'normal' });
							},
							() => {
								this.window.emit('setup', IpcChannel.Setup_Step, 'Extracting FFmpeg...');
								setupWindow.setProgressBar(1, { mode: 'indeterminate' });
							},
							() => this.window.emit('setup', IpcChannel.Setup_Step, 'Cleaning up...')
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

				this.finished = true;

				if (this.cts.isCancellationRequested) {
					setupWindow.setProgressBar(1, { mode: 'error' });
				} else {
					this.window.emit('setup', IpcChannel.Setup_Step, 'Done!');
					setupWindow.setProgressBar(1, { mode: 'normal' });
				}
			}
		});

		setupWindow.once('close', () => {
			if (!this.finished) {
				this.cancel();
			}
		});

		return new Promise<void>((res) => {
			const interval = setInterval(() => {
				if (this.cts.isCancellationRequested) {
					app.exit(0);
					clearInterval(interval);
				} else if (this.finished) {
					setupWindow.closable = true;
					setupWindow.close();
					clearInterval(interval);
					res();
				}
			}, 500);
		});
	}

	private async hasYtdlpBinary(localPath: string): Promise<boolean> {
		this.logger.info('Checking for yt-dlp binary');

		const currentPath       = this.settings.get(SettingsKey.YtdlpPath);
		const localBinaryExists = await fileExists(localPath);
		if (localBinaryExists) {
			this.logger.info('Found yt-dlp binary', { path: localPath });

			if (currentPath !== localPath) {
				await this.settings.set(SettingsKey.YtdlpPath, localPath);
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
		const versionPattern = /\d{4}\.\d+\.\d+/;
		return new Promise<boolean>((res, rej) => {
			let output = '';
			const proc = spawn(binaryPath, ['--version']);
			proc.stdout.on('data', data => output += data.toString());
			proc.on('error', err => rej(err));
			proc.on('close', () => {
				const matches = versionPattern.exec(output.trim());
				if (matches) {
					this.logger.debug('PATH yt-dlp binary is verified', { version: matches[0] });
					res(true);
				} else {
					rej(new Error('Version pattern not found in output'));
				}
			});
		});
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
}
