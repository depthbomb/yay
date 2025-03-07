import { unlink } from 'node:fs/promises';
import { IpcChannel, SettingsKey } from 'shared';
import { app, Menu, shell, dialog } from 'electron';
import { fileExists, getExtraFilePath } from '~/utils';
import { MIN_WIDTH, MIN_HEIGHT, PRELOAD_PATH } from '~/constants';
import type { Container } from '~/lib/Container';
import type { MessageBoxOptions } from 'electron';

export class MainWindowModule {
	public static async bootstrap(container: Container) {
		const ipc             = container.get('Ipc');
		const windowManager   = container.get('WindowManager');
		const settingsManager = container.get('SettingsManager');
		const eventSubscriber = container.get('EventSubscriber');
		const showFrame       = settingsManager.get<boolean>(SettingsKey.ShowWindowFrame);
		const mainWindow = windowManager.createMainWindow({
			url: windowManager.resolveRendererHTML('index.html'),
			browserWindowOptions: {
				show: false,
				width: MIN_WIDTH,
				height: MIN_HEIGHT,
				alwaysOnTop: true,
				resizable: false,
				frame: showFrame,
				minimizable: showFrame,
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
					mainWindow.webContents.openDevTools({ mode: 'detach' });
				}
			}
		});

		let windowPinned = import.meta.env.DEV;

		// This is primarily used to keep the window open when the user has the download dir picker
		// dialog open.
		let shouldHideOnBlur = true;

		mainWindow.webContents.setWindowOpenHandler(({ url }) => {
			const requestedUrl = new URL(url);
			if (requestedUrl.host === 'github.com') {
				// Currently the only intended links to open in an external browser are for GitHub.
				shell.openExternal(url);
			}

			return { action: 'deny' };
		});

		//#region Main window events
		mainWindow.on('close', e => {
			e.preventDefault();
			mainWindow.hide();
		});

		mainWindow.on('blur', () => {
			if (shouldHideOnBlur && !windowPinned) {
				mainWindow.hide();
			}

			windowManager.emitMain(IpcChannel.WindowBlurred);
		});

		mainWindow.on('focus', () => mainWindow.flashFrame(false));
		//#endregion

		//#region IPC
		ipc.registerHandler(IpcChannel.PlayNotificationSound, () => ipc.emitToMainWindow(IpcChannel.PlayNotificationSound));

		ipc.registerHandler(IpcChannel.ToggleWindowPinned, () => {
			return windowPinned = !windowPinned;
		});

		ipc.registerHandler(IpcChannel.ShowInputRightClickMenu, () => {
			const menu = Menu.buildFromTemplate([ { role: 'paste' } ]);

			menu.popup({ window: mainWindow });
		});

		ipc.registerHandler(IpcChannel.OpenDownloadDir, async () => await shell.openPath(settingsManager.get(SettingsKey.DownloadDir)));

		ipc.registerHandler(IpcChannel.OpenDownloadDirPicker, async () => {
			shouldHideOnBlur = false;

			const { filePaths, canceled } = await dialog.showOpenDialog(mainWindow, {
				title: 'Choose a download folder',
				defaultPath: settingsManager.get(SettingsKey.DownloadDir, ''),
				properties: ['openDirectory']
			});

			if (!canceled && filePaths.length === 1) {
				const chosenPath = filePaths[0];
				await settingsManager.set(SettingsKey.DownloadDir, chosenPath);

				shouldHideOnBlur = true;

				return chosenPath;
			}

			shouldHideOnBlur = true;

			return null;
		});

		ipc.registerHandler(IpcChannel.RecheckBinaries, async () => {
			for (const bin of ['yt-dlp.exe', 'ffmpeg.exe', 'ffprobe.exe']) {
				const binPath = getExtraFilePath(bin);
				if (!await fileExists(binPath)) {
					continue;
				}

				await unlink(binPath);
			}

			await settingsManager.set(SettingsKey.YtdlpPath, null);

			app.relaunch({ args: ['--updateBinaries'] });
			app.exit(0);
		});

		ipc.registerHandler(IpcChannel.ShowMessageBox, async (_, options: MessageBoxOptions) => await dialog.showMessageBox(mainWindow, options));
		//#endregion

		//#region Events
		eventSubscriber.subscribe('download-started', () => mainWindow.setProgressBar(1, { mode: 'indeterminate' }));
		eventSubscriber.subscribe('download-finished', () => {
			mainWindow.setProgressBar(0, { mode: 'none' });
			mainWindow.flashFrame(true);
		});
		//#endregion
	}
}
