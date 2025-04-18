import { unlink } from 'node:fs/promises';
import { PRELOAD_PATH } from '~/constants';
import { IpcService } from '~/services/ipc';
import { TrayService } from '~/services/tray';
import { SetupService } from '~/services/setup';
import { YtdlpService } from '~/services/ytdlp';
import { IpcChannel, SettingsKey } from 'shared';
import { EventsService } from '~/services/events';
import { WindowService } from '~/services/window';
import { UpdaterService } from '~/services/updater';
import { app, Menu, shell, dialog } from 'electron';
import { inject, injectable } from '@needle-di/core';
import { SettingsService } from '~/services/settings';
import { DeepLinksService } from '~/services/deepLinks';
import { AutoStartService } from '~/services/autoStart';
import { GlobalMenuService } from '~/services/globalMenu';
import { fileExists, getExtraFilePath, windowOpenHandler } from '~/utils';
import type { Maybe } from 'shared';
import type { BrowserWindow, MessageBoxOptions } from 'electron';

@injectable()
export class MainService {
	private mainWindow: Maybe<BrowserWindow>;
	private windowPinned     = import.meta.env.DEV;
	private shouldHideOnBlur = true;

	public constructor(
		private readonly ipc        = inject(IpcService),
		private readonly window     = inject(WindowService),
		private readonly events     = inject(EventsService),
		private readonly autoStart  = inject(AutoStartService),
		private readonly settings   = inject(SettingsService),
		private readonly setup      = inject(SetupService),
		private readonly ytdlp      = inject(YtdlpService),
		private readonly updater    = inject(UpdaterService),
		private readonly tray       = inject(TrayService),
		private readonly globalMenu = inject(GlobalMenuService),
		private readonly deepLinks  = inject(DeepLinksService),
	) {}

	public async boot() {
		//#region Main Window
		this.mainWindow = this.window.createMainWindow({
			url: this.window.resolveRendererHTML('index.html'),
			browserWindowOptions: {
				show: false,
				width: 425,
				height: 550,
				alwaysOnTop: true,
				resizable: false,
				frame: false,
				minimizable: false,
				maximizable: false,
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
			},
			onReadyToShow: () => {
				if (import.meta.env.DEV) {
					this.mainWindow!.webContents.openDevTools({ mode: 'detach' });
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
		this.events.subscribe('download-started', () => this.mainWindow!.setProgressBar(1, { mode: 'indeterminate' }));
		this.events.subscribe('download-finished', () => {
			this.mainWindow!.setProgressBar(0, { mode: 'none' });
			this.mainWindow!.flashFrame(true);
		});
		//#endregion

		await this.settings.bootstrap();
		await this.autoStart.bootstrap();
		await this.window.bootstrap();
		await this.ytdlp.bootstrap();
		await this.globalMenu.bootstrap();
		await this.deepLinks.bootstrap();
		await this.tray.bootstrap();
		await this.setup.performSetupActions();
		await this.updater.bootstrap();
	}
}
