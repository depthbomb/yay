import { unlink } from 'node:fs/promises';
import { app, Menu, Tray } from 'electron';
import { getExtraFilePath, getExtraResourcePath } from '~/utils';
import type { MenuItemConstructorOptions } from 'electron';
import type { ModuleRegistry } from '~/lib/ModuleRegistry';

export class TrayManagerModule {
	public static bootstrap(moduleRegistry: ModuleRegistry) {
		const windowManager    = moduleRegistry.get('WindowManager');
		const eventSubscriber  = moduleRegistry.get('EventSubscriber');
		const windowPositioner = moduleRegistry.get('WindowPositioner');

		const trayTooltip         = 'Yet Another YouTube Downloader' as const;
		const logoIcon            = getExtraResourcePath('tray/action-icons/logo-16.png');
		const showIcon            = getExtraResourcePath('tray/action-icons/open-in-new.png');
		const quitIcon            = getExtraResourcePath('tray/action-icons/close.png');
		const trayIcon            = getExtraResourcePath('tray/tray.ico');
		const trayDownloadingIcon = getExtraResourcePath('tray/tray-downloading.ico');

		eventSubscriber.subscribe('setup-finished', () => {
			const tray = new Tray(trayIcon);
			const menu = [] as MenuItemConstructorOptions[];

			tray.setToolTip(trayTooltip);

			menu.push(
				{
					label: 'yay',
					icon: logoIcon,
					enabled: false,
				},
				{ type: 'separator' }
			);

			if (import.meta.env.DEV) {
				menu.push(
					{
						label: 'Developer',
						submenu: [
							{
								label: 'Delete downloadable binaries',
								click: async () => {
									await Promise.allSettled([
										unlink(getExtraFilePath('yt-dlp.exe')),
										unlink(getExtraFilePath('ffmpeg.exe')),
										unlink(getExtraFilePath('ffprobe.exe')),
									]);
								}
							},
							{
								label: 'Relaunch',
								click: () => {
									app.relaunch();
									app.exit(0);
								}
							}
						]
					},
					{ type: 'separator' }
				);
			}

			menu.push(
				{
					label: 'Show',
					icon: showIcon,
					click: () => tray.emit('click')
				},
				{
					type: 'separator'
				},
				{
					label: 'Quit',
					icon: quitIcon,
					click: () => app.exit(0)
				}
			);

			tray.setContextMenu(Menu.buildFromTemplate(menu));
			tray.on('click', () => {
				const mainWindow = windowManager.getMainWindow()!;
				windowPositioner.positionWindowAtTray(mainWindow, tray);
				mainWindow.show();
				mainWindow.focus();
			});

			eventSubscriber.subscribe('download-started', url => {
				tray.setImage(trayDownloadingIcon);
				tray.setToolTip(`Downloading ${url}`);
			});

			eventSubscriber.subscribe('download-finished', () => {
				tray.setImage(trayIcon);
				tray.setToolTip(trayTooltip);
			});
		});
	}
}
