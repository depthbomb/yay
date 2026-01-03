import { ESettingsKey } from 'shared';
import { spawn } from 'node:child_process';
import { PRELOAD_PATH } from '~/constants';
import { CLIService } from '~/services/cli';
import { IPCService } from '~/services/ipc';
import { getExtraFilePath } from '~/common';
import { TimerService } from '~/services/timer';
import { YtdlpService } from '~/services/ytdlp';
import { OnlineChecker } from './onlineChecker';
import { WindowService } from '~/services/window';
import { fileExists } from '@depthbomb/node-common';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import { SettingsService } from '~/services/settings';
import { BinaryDownloader } from './binaryDownloader';
import { app, shell, dialog, BrowserWindow } from 'electron';
import { CancellationTokenSource, OperationCancelledError } from '@depthbomb/node-common';
import type { Maybe } from 'shared';
import type { IBootstrappable } from '~/common';

@injectable()
export class SetupService implements IBootstrappable {
	private finished = false;
	private downloadedYtdlpBinary = false;
	private setupWindow: Maybe<BrowserWindow>;
	private readonly cts = new CancellationTokenSource();

	public constructor(
		private readonly logger        = inject(LoggingService),
		private readonly cli           = inject(CLIService),
		private readonly ipc           = inject(IPCService),
		private readonly window        = inject(WindowService),
		private readonly timer         = inject(TimerService),
		private readonly settings      = inject(SettingsService),
		private readonly downloader    = inject(BinaryDownloader),
		private readonly onlineChecker = inject(OnlineChecker),
		private readonly ytdlp         = inject(YtdlpService),
	) {}

	public async bootstrap() {
		this.ipc.registerHandler('setup<-show-window', () => {
			// This handler is ever only called in dev mode so we set `finished` to false so the
			// window doesn't immediately close.

			this.finished = false;
			this.showWindow();
		});
		this.ipc.registerHandler('setup<-cancel', () => this.cancel());

		await this.performSetupActions();
	}

	public cancel() {
		this.emitStep('Cancelling...');
		this.cts.cancel();
	}

	private async performSetupActions() {
		await this.showWindow();
		await this.setDefaultSettings();
		await this.checkIfOnline();

		const ok = await this.checkForBinaries();
		if (!ok) {
			app.quit();
			return;
		}

		if (this.settings.get(ESettingsKey.UpdateYtdlpOnStartup, true) && !this.downloadedYtdlpBinary) {
			await this.updateYtdlp();
		}

		this.emitStep('Done!');
		this.window.emit('setup', 'setup->done');
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
			[ESettingsKey.HideSetupWindow, false],
			[ESettingsKey.DisableHardwareAcceleration, false],
			[ESettingsKey.UpdateYtdlpOnStartup, true],
			[ESettingsKey.UseNewTwitterVideoDownloader, true],
		]);
	}

	private async showWindow() {
		const { promise, resolve } = Promise.withResolvers<void>();
		this.setupWindow = this.window.createWindow('setup', {
			url: this.window.useRendererRouter('setup'),
			browserWindowOptions: {
				show: false,
				width: 500,
				height: 300,
				titleBarStyle: 'hidden',
				resizable: false,
				maximizable: false,
				backgroundColor: '#191919',
				webPreferences: {
					spellcheck: false,
					enableWebSQL: false,
					nodeIntegration: true,
					devTools: import.meta.env.DEV,
					preload: PRELOAD_PATH,
				}
			},
			onReadyToShow: () => {
				const hideSetupWindow = this.settings.get<boolean>(ESettingsKey.HideSetupWindow);
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

		const interval = this.timer.setInterval(() => {
			if (this.cts.isCancellationRequested) {
				app.quit();
				this.timer.clearInterval(interval);
			} else if (this.finished) {
				this.setupWindow!.close();
				this.timer.clearInterval(interval);
			}
		}, 250);

		return promise;
	}

	private async checkForBinaries() {
		this.setupWindow!.setProgressBar(1, { mode: 'indeterminate' });

		const token           = this.cts.token;
		const signal          = token.toAbortSignal();
		const ytdlpPath       = getExtraFilePath('yt-dlp.exe');
		const denoPath        = getExtraFilePath('deno.exe');
		const ffmpegPath      = getExtraFilePath('ffmpeg.exe');
		const ffprobePath     = getExtraFilePath('ffprobe.exe');
		const hideSetupWindow = this.settings.get<boolean>(ESettingsKey.HideSetupWindow);

		this.emitStep('Verifying yt-dlp...');

		const hasYtdlp = await this.hasYtdlpBinary(ytdlpPath);

		this.emitStep('Verifying Deno...');

		const hasDeno = await this.hasDenoBinary(denoPath);

		this.emitStep('Checking for FFmpeg...');

		const hasFfmpeg = await Promise.all([
			fileExists(ffmpegPath),
			fileExists(ffprobePath)
		]).then(r => r.every(Boolean));

		if (!hasYtdlp || !hasFfmpeg || !hasDeno) {
			if (hideSetupWindow) {
				this.setupWindow!.show();
			}

			const missingDependencies = [];

			if (!hasYtdlp) missingDependencies.push('yt-dlp');
			if (!hasDeno) missingDependencies.push('Deno');
			if (!hasFfmpeg) missingDependencies.push('FFmpeg');
			if (!this.cli.flags.updateBinaries) {
				const res = await dialog.showMessageBox(this.setupWindow!, {
					type: 'info',
					message: `Some files that yay uses are missing from your system:\n\n${missingDependencies.join('\n')}\n\nWould you like yay to download them?`,
					buttons: ['Yes', 'No'],
					defaultId: 0
				});
				if (res.response !== 0) {
					return false;
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
						this.emitStep(`Downloading yt-dlp... (${progress}%)`, progress);
						this.setupWindow!.setProgressBar(progress / 100, { mode: 'normal' });
					}
				);

				this.downloadedYtdlpBinary = true;

				await this.settings.set(ESettingsKey.YtdlpPath, ytdlpPath);
			} catch (err) {
				if (!(err instanceof OperationCancelledError)) {
					const res = await dialog.showMessageBox(this.setupWindow!, {
						type: 'error',
						message: `There was an issue downloading the latest release of yt-dlp.\nYou can try to manually download the latest release and place the file into the same folder as yay.exe\n\nWould you like to continue to the download?`,
						buttons: ['Yes', 'No'],
						defaultId: 0
					});

					if (res.response === 0) {
						await shell.openExternal('https://github.com/yt-dlp/yt-dlp/releases/download/latest/yt-dlp.exe');
					} else {
						return false;
					}
				}
			}
		}

		if (!hasDeno && !this.cts.isCancellationRequested) {
			this.emitStep('Starting Deno download...');

			try {
				await this.downloader.downloadDenoBinary(
					signal,
					progress => {
						this.emitStep(`Downloading Deno... (${progress}%)`, progress);
						this.setupWindow!.setProgressBar(progress / 100, { mode: 'normal' });
					},
					() => {
						this.emitStep('Extracting Deno...');
						this.setupWindow!.setProgressBar(1, { mode: 'indeterminate' });
					},
					() => this.emitStep('Cleaning up...')
				);
			} catch (err) {
				if (!(err instanceof OperationCancelledError)) {
					const res = await dialog.showMessageBox(this.setupWindow!, {
						type: 'error',
						message: `There was an issue downloading the latest release of Deno.\nThis file is currently not required but will likely be in the future.\n\nWould you like to continue?`,
						buttons: ['Yes', 'No'],
						defaultId: 0
					});

					if (res.response !== 0) {
						return false;
					}
				}
			}
		}

		if (!hasFfmpeg && !this.cts.isCancellationRequested) {
			this.emitStep('Starting FFmpeg download...');

			try {
				await this.downloader.downloadFfmpegBinary(
					signal,
					progress => {
						this.emitStep(`Downloading FFmpeg... (${progress}%)`, progress);
						this.setupWindow!.setProgressBar(progress / 100, { mode: 'normal' });
					},
					() => {
						this.emitStep('Extracting FFmpeg...');
						this.setupWindow!.setProgressBar(1, { mode: 'indeterminate' });
					},
					() => this.emitStep('Cleaning up...')
				);
			} catch (err) {
				if (!(err instanceof OperationCancelledError)) {
					const res = await dialog.showMessageBox(this.setupWindow!, {
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
						return false;
					}
				}
			}
		}

		if (this.cts.isCancellationRequested) {
			this.setupWindow!.setProgressBar(1, { mode: 'error' });
		}

		return true;
	}

	private async hasYtdlpBinary(path: string) {
		this.logger.info('Checking for yt-dlp binary');

		const currentPath       = this.settings.get(ESettingsKey.YtdlpPath);
		const localBinaryExists = await fileExists(path);
		const test              = (path: string) => this.testBinary(path, ['--version'], /\d{4}\.\d+\.\d+/);
		if (localBinaryExists) {
			this.logger.info('Found yt-dlp binary', { path });

			if (currentPath !== path) {
				await this.settings.set(ESettingsKey.YtdlpPath, path);
			}

			return test(path);
		}

		return test('yt-dlp');
	}

	private async hasDenoBinary(path: string) {
		this.logger.info('Checking for deno binary');

		const currentPath       = this.settings.get(ESettingsKey.DenoPath);
		const localBinaryExists = await fileExists(path);
		const test              = (path: string) => this.testBinary(path, ['-v'], /\d+\.\d+\.\d+/);
		if (localBinaryExists) {
			this.logger.info('Found deno binary', { path });

			if (currentPath !== path) {
				await this.settings.set(ESettingsKey.DenoPath, path);
			}

			return test(path);
		}

		return test('deno');
	}

	private testBinary(name: string, args: string[], checkRegex: RegExp) {
		const { resolve, promise } = Promise.withResolvers<boolean>();

		this.logger.info('Testing binary', { name, args, regex: checkRegex.toString() })

		let output = '';
		const proc = spawn(name, args);
		proc.stdout.on('data', (data: Buffer) => output += data.toString());
		proc.once('error', err => {
			this.logger.error('Error spawning process for binary test', { err });
			resolve(false);
		});
		proc.once('close', () => {
			output = output.trim();
			const matches = checkRegex.exec(output);
			if (matches) {
				this.logger.debug('Binary passes test', { output });
				resolve(true);
			} else {
				this.logger.debug('Binary does not pass test', { output });
				resolve(false);
			}
		});

		return promise;
	}

	private async checkIfOnline() {
		const isOnline = await this.onlineChecker.checkIfOnline();
		if (isOnline) {
			return;
		}

		const res = await dialog.showMessageBox(this.setupWindow!, {
			type: 'warning',
			message: 'It appears that you have no internet connection.\nThis application cannot function without an internet connection.\n\nWould you still like to continue?',
			buttons: ['Yes', 'No'],
			defaultId: 0
		});
		if (res.response !== 0) {
			app.quit();
		}
	}

	private async updateYtdlp() {
		this.setupWindow!.setProgressBar(1, { mode: 'indeterminate' });
		this.emitStep('Checking for yt-dlp updates...');

		await this.ytdlp.updateBinary(true);
	}

	private emitStep(message: string, progress = -1) {
		this.window.emit('setup', 'setup->step', { message, progress });
	}
}
