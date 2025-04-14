import { app, dialog } from 'electron';
import { spawn } from 'node:child_process';
import { PRELOAD_PATH } from '~/constants';
import { IpcChannel, SettingsKey } from 'shared';
import { fileExists, getExtraFilePath } from '~/utils';
import type { Flags } from '~/lib/Cli';
import type { EventEmitter } from '~/lib/EventEmitter';
import type { WindowManager } from '~/lib/WindowManager';
import type { BinaryDownloader } from './binaryDownloader';
import type { SettingsManager } from '~/lib/SettingsManager';

export class Setup {
	private cancelled = false;

	private readonly abort = new AbortController();

	public constructor(
		private readonly flags: Flags,
		private readonly eventEmitter: EventEmitter,
		private readonly windowManager: WindowManager,
		private readonly settingsManager: SettingsManager,
		private readonly downloader: BinaryDownloader,
	) {}

	public async performSetup() {
		await this.setDefaultSettings();
		await this.checkForBinaries();

		this.eventEmitter.emit('setup-finished');
	}

	public cancel() {
		this.cancelled = true;
		this.abort.abort();
	}

	private async setDefaultSettings() {
		await this.settingsManager.setDefault(SettingsKey.YtdlpPath, 'yt-dlp');
		await this.settingsManager.setDefault(SettingsKey.DownloadDir, app.getPath('downloads'));
		await this.settingsManager.setDefault(SettingsKey.DownloadNameTemplate, '%(title)s [%(id)s].%(ext)s');
		await this.settingsManager.setDefault(SettingsKey.SkipYoutubePlaylists, true);
		await this.settingsManager.setDefault(SettingsKey.DefaultDownloadAction, 'video');
		await this.settingsManager.setDefault(SettingsKey.EnableGlobalMenu, false);
		await this.settingsManager.setDefault(SettingsKey.EnableDownloadCompletionToast, true);
		await this.settingsManager.setDefault(SettingsKey.EnableNewReleaseToast, true);
	}

	private async checkForBinaries() {
		let checkFinished = false;

		const ytdlpPath   = getExtraFilePath('yt-dlp.exe');
		const ffmpegPath  = getExtraFilePath('ffmpeg.exe');
		const ffprobePath = getExtraFilePath('ffprobe.exe');

		const setupWindow = this.windowManager.createWindow('setup', {
			url: this.windowManager.resolveRendererHTML('setup.html'),
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
				if (import.meta.env.DEV) {
					setupWindow.webContents.openDevTools({ mode: 'detach' });
				}

				const hideSetupWindow =  this.settingsManager.get<boolean>(SettingsKey.HideSetupWindow);
				if (!hideSetupWindow || this.flags.updateBinaries) {
					setupWindow.show();
				}

				setupWindow.setProgressBar(1, { mode: 'indeterminate' });

				this.windowManager.emit('setup', IpcChannel.Setup_Step, 'Checking for yt-dlp...');

				const hasYtdlp = await this.hasYtdlpBinary(ytdlpPath);

				this.windowManager.emit('setup', IpcChannel.Setup_Step, 'Checking for FFmpeg...');

				const hasFfmpeg = await Promise.all([fileExists(ffmpegPath), fileExists(ffprobePath)]).then(r => r.every(Boolean));

				if (!hasYtdlp || !hasFfmpeg) {
					if (hideSetupWindow) {
						setupWindow.show();
					}

					const mainWindow          = this.windowManager.getMainWindow()!;
					const missingDependencies = [];

					if (!hasYtdlp) missingDependencies.push('yt-dlp');
					if (!hasFfmpeg) missingDependencies.push('FFmpeg');
					if (!this.flags.updateBinaries) {
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

				if (!hasYtdlp) {
					this.windowManager.emit('setup', IpcChannel.Setup_Step, 'Starting yt-dlp download...');

					await this.downloader.downloadYtdlpBinary(
						ytdlpPath,
						this.abort.signal,
						progress => {
							this.windowManager.emit('setup', IpcChannel.Setup_Step, `Downloading yt-dlp... (${progress}%)`);
							setupWindow.setProgressBar(progress / 100, { mode: 'normal' });
						}
					);

					await this.settingsManager.set(SettingsKey.YtdlpPath, ytdlpPath);
				}

				if (!hasFfmpeg) {
					this.windowManager.emit('setup', IpcChannel.Setup_Step, 'Starting FFmpeg download...');

					await this.downloader.downloadFfmpegBinary(
						ffmpegPath,
						this.abort.signal,
						progress => {
							this.windowManager.emit('setup', IpcChannel.Setup_Step, `Downloading FFmpeg... (${progress}%)`);
							setupWindow.setProgressBar(progress / 100, { mode: 'normal' });
						},
						() => {
							this.windowManager.emit('setup', IpcChannel.Setup_Step, 'Extracting FFmpeg...');
							setupWindow.setProgressBar(1, { mode: 'indeterminate' });
						},
						() => this.windowManager.emit('setup', IpcChannel.Setup_Step, 'Cleaning up...')
					);
				}

				checkFinished = true;

				if (this.cancelled) {
					this.windowManager.emit('setup', IpcChannel.Setup_Step, 'Cancelling...');
					setupWindow.setProgressBar(1, { mode: 'error' });
				} else {
					this.windowManager.emit('setup', IpcChannel.Setup_Step, 'Done!');
					setupWindow.setProgressBar(1, { mode: 'normal' });
				}
			}
		});

		setupWindow.once('close', () => this.cancel());

		return new Promise<void>((res) => {
			const interval = setInterval(() => {
				if (this.abort.signal.aborted) {
					app.exit(0);
					clearInterval(interval);
				} else if (checkFinished) {
					setupWindow.closable = true;
					setupWindow.close();
					clearInterval(interval);
					res();
				}
			}, 500);
		});
	}

	private async hasYtdlpBinary(localPath: string): Promise<boolean> {
		const localBinaryExists = await fileExists(localPath);
		if (localBinaryExists) {
			return true;
		}

		const currentPath = this.settingsManager.get(SettingsKey.YtdlpPath);
		if (currentPath === 'yt-dlp') {
			try {
				const isValid = await this.verifyYtdlpBinary('yt-dlp');
				if (isValid) {
					return true;
				}
			} catch (err) {
				console.error(`PATH yt-dlp binary no longer works: ${err}`);
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
					res(true);
				} else {
					rej(new Error('Version pattern not found in output'));
				}
			});
		});
	}
}
