import { unlink } from 'fs/promises';
import { PRELOAD_PATH } from '~/constants';
import { IpcService } from '~/services/ipc';
import { YtdlpService } from '~/services/ytdlp';
import { IpcChannel, SettingsKey } from 'shared';
import { WindowService } from '~/services/window';
import { app, Menu, shell, dialog } from 'electron';
import { inject, injectable } from '@needle-di/core';
import { SettingsService } from '~/services/settings';
import { LifecycleService } from '~/services/lifecycle';
import { fileExists, getExtraFilePath, windowOpenHandler } from '~/utils';
import type { Maybe } from 'shared';
import type { IBootstrappable } from '~/common/IBootstrappable';
import type { BrowserWindow, MessageBoxOptions } from 'electron';

@injectable()
export class MainWindowService implements IBootstrappable {
	private mainWindow: Maybe<BrowserWindow>;
	private windowPinned     = import.meta.env.DEV;
	private shouldHideOnBlur = true;

	public constructor(
		private readonly lifecycle = inject(LifecycleService),
		private readonly ipc       = inject(IpcService),
		private readonly settings  = inject(SettingsService),
		private readonly window    = inject(WindowService),
		private readonly ytdlp     = inject(YtdlpService),
	) {}

	public async bootstrap(): Promise<void> {
		//#region Window creation
		this.mainWindow = this.window.createMainWindow({
			url: this.window.resolveRendererHTML('index.html'),
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
				backgroundColor: '#000',
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
			if (this.shouldHideOnBlur && !this.windowPinned) {
				this.mainWindow!.hide();
			}

			this.window.emitMain(IpcChannel.Window_IsBlurred);
		});
		this.mainWindow.on('focus', () => this.mainWindow!.flashFrame(false));
		this.mainWindow.on('close', e => {
			if (!this.lifecycle.shutdownRequested) {
				e.preventDefault();
				this.mainWindow!.hide();
			}
		});
		this.mainWindow.webContents.setWindowOpenHandler(windowOpenHandler);
		//#endregion

		//#region IPC
		this.ipc.registerHandler(IpcChannel.Main_ToggleWindowPinned, () => this.windowPinned = !this.windowPinned);
		this.ipc.registerHandler(IpcChannel.Main_ShowUrlMenu, () => {
			const menu = Menu.buildFromTemplate([ { role: 'paste' } ]);

			menu.popup({ window: this.mainWindow });
		});
		this.ipc.registerHandler(IpcChannel.Main_OpenDownloadDir, async () => await shell.openPath(this.settings.get(SettingsKey.DownloadDir)));
		this.ipc.registerHandler(IpcChannel.Main_PickDownloadDir, async () => {
			this.shouldHideOnBlur = false;

			const { filePaths, canceled } = await dialog.showOpenDialog(this.mainWindow!, {
				title: 'Choose a download folder',
				defaultPath: this.settings.get(SettingsKey.DownloadDir, ''),
				properties: ['openDirectory']
			});

			if (!canceled && filePaths.length === 1) {
				const chosenPath = filePaths[0];
				await this.settings.set(SettingsKey.DownloadDir, chosenPath);

				this.shouldHideOnBlur = true;

				return chosenPath;
			}

			this.shouldHideOnBlur = true;

			return null;
		});
		this.ipc.registerHandler(IpcChannel.Ytdlp_RecheckBinaries, async () => {
			for (const bin of ['yt-dlp.exe', 'ffmpeg.exe', 'ffprobe.exe']) {
				const binPath = getExtraFilePath(bin);
				if (!await fileExists(binPath)) {
					continue;
				}

				await unlink(binPath);
			}

			await this.settings.set(SettingsKey.YtdlpPath, null);

			app.relaunch({ args: ['--updateBinaries'] });
			app.exit(0);
		});
		this.ipc.registerHandler(IpcChannel.ShowMessageBox, async (_, options: MessageBoxOptions) => await dialog.showMessageBox(this.mainWindow!, options));
		//#endregion

		//#region Events
		this.ytdlp.events.on('downloadStarted', () => this.mainWindow!.setProgressBar(1, { mode: 'indeterminate' }));
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
}
