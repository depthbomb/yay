import { IpcService } from '~/services/ipc';
import { TrayService } from '~/services/tray';
import { app, shell, dialog } from 'electron';
import { unlink, copyFile } from 'fs/promises';
import { YtdlpService } from '~/services/ytdlp';
import { IpcChannel, SettingsKey } from 'shared';
import { WindowService } from '~/services/window';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import { SettingsService } from '~/services/settings';
import { LifecycleService } from '~/services/lifecycle';
import { fileExists, getExtraFilePath } from '~/common';
import { PRELOAD_PATH, EXTERNAL_URL_RULES } from '~/constants';
import { WindowPositionService } from '~/services/windowPosition';
import type { Maybe } from 'shared';
import type { BrowserWindow } from 'electron';
import type { IBootstrappable } from '~/common/IBootstrappable';

@injectable()
export class MainWindowService implements IBootstrappable {
	private mainWindow: Maybe<BrowserWindow>;
	private windowPinned = import.meta.env.DEV;

	public constructor(
		private readonly logger         = inject(LoggingService),
		private readonly lifecycle      = inject(LifecycleService),
		private readonly ipc            = inject(IpcService),
		private readonly settings       = inject(SettingsService),
		private readonly window         = inject(WindowService),
		private readonly windowPosition = inject(WindowPositionService),
		private readonly tray           = inject(TrayService, { lazy: true }),
		private readonly ytdlp          = inject(YtdlpService),
	) {}

	public async bootstrap(): Promise<void> {
		//#region Window creation
		this.mainWindow = this.window.createMainWindow({
			url: this.window.resolveRendererHTML('index.html'),
			externalUrlRules: EXTERNAL_URL_RULES,
			browserWindowOptions: {
				show: false,
				width: 400,
				height: 550,
				alwaysOnTop: true,
				resizable: false,
				frame: false,
				minimizable: false,
				maximizable: false,
				closable: false,
				skipTaskbar: import.meta.env.PROD,
				roundedCorners: false,
				webPreferences: {
					spellcheck: false,
					enableWebSQL: false,
					nodeIntegration: true,
					devTools: import.meta.env.DEV,
					preload: PRELOAD_PATH,
				}
			}
		});
		this.mainWindow.on('blur', () => {
			if (!this.windowPinned) {
				this.mainWindow!.hide();
			}

			this.window.emitMain(IpcChannel.Window_IsBlurred);
		});
		this.mainWindow.on('focus', () => {
			this.mainWindow!.flashFrame(false);
			this.window.emitMain(IpcChannel.Window_IsFocused);
		});
		this.mainWindow.on('close', e => {
			if (!this.lifecycle.shutdownRequested) {
				e.preventDefault();
				this.mainWindow!.hide();
			}
		});
		//#endregion

		//#region IPC
		this.ipc.registerHandler(IpcChannel.Main_ToggleWindowPinned, () => this.windowPinned = !this.windowPinned);
		this.ipc.registerHandler(IpcChannel.Main_OpenDownloadDir, async () => {
			this.logger.info('Opening download directory');

			await shell.openPath(this.settings.get(SettingsKey.DownloadDir));
		});
		this.ipc.registerHandler(IpcChannel.Main_PickDownloadDir, async () => {
			this.logger.info('Opening download directory picker');

			const { filePaths, canceled } = await dialog.showOpenDialog(this.window.getWindow('settings')!, {
				title: 'Choose a download folder',
				defaultPath: this.settings.get(SettingsKey.DownloadDir, ''),
				properties: ['openDirectory']
			});

			if (!canceled && filePaths.length === 1) {
				const chosenPath = filePaths[0];
				await this.settings.set(SettingsKey.DownloadDir, chosenPath);

				this.logger.debug('Set download directory', { chosenPath });

				return chosenPath;
			}

			return null;
		});
		this.ipc.registerHandler(IpcChannel.Main_PickCookiesFile, async () => {
			this.logger.info('Opening cookies file picker');

			const { filePaths, canceled } = await dialog.showOpenDialog(this.window.getWindow('settings')!, {
				title: 'Locate cookies.txt file',
				filters: [{ name: '.txt files', extensions: ['txt'] }],
				properties: ['openFile']
			});

			if (!canceled && filePaths.length === 1) {
				const chosenPath      = filePaths[0];
				const destinationPath = getExtraFilePath('cookies.txt');

				await copyFile(chosenPath, destinationPath);
				await this.settings.set(SettingsKey.CookiesFilePath, destinationPath);

				this.logger.debug('Copied cookies file', { from: chosenPath, to: destinationPath });

				return destinationPath;
			}

			return null;
		});
		this.ipc.registerHandler(IpcChannel.Ytdlp_RecheckBinaries, async () => {
			this.logger.info('Rechecking binaries');

			for (const bin of ['yt-dlp.exe', 'ffmpeg.exe', 'ffprobe.exe']) {
				const binPath = getExtraFilePath(bin);
				if (!await fileExists(binPath)) {
					continue;
				}

				this.logger.debug('Deleting binary due to recheck', { bin });

				await unlink(binPath);
			}

			await this.settings.set(SettingsKey.YtdlpPath, null);

			this.logger.debug('Relaunching app');

			app.relaunch({ args: ['--updateBinaries'] });
			app.exit(0);
		});
		//#endregion

		//#region Events
		this.ytdlp.events.on('downloadStarted',  () => this.mainWindow!.setProgressBar(1, { mode: 'indeterminate' }));
		this.ytdlp.events.on('downloadProgress', p => this.mainWindow!.setProgressBar(p, { mode: 'normal' }));
		this.ytdlp.events.on('downloadFinished', () => {
			this.mainWindow!.setProgressBar(0, { mode: 'none' });
			this.mainWindow!.flashFrame(true);
		});
		//#endregion

		this.lifecycle.events.on('shutdown', () => {
			if (this.mainWindow) {
				this.mainWindow.closable = true;
				this.mainWindow.close();
			}
		});
	}

	public showMainWindow() {
		const { tray }   = this.tray();
		const mainWindow = this.mainWindow!;

		this.windowPosition.setWindowPositionAtTray(mainWindow, tray!);

		mainWindow.show();
		mainWindow.focus();
	}
}
