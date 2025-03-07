import { unlink } from 'node:fs/promises';
import { app, Menu, Tray } from 'electron';
import { getExtraFilePath, getExtraResourcePath } from '~/utils';
import type { MenuItemConstructorOptions } from 'electron';
import type { Container } from '~/lib/Container';

export class TrayManagerModule {
	public static bootstrap(container: Container) {
		const windowManager    = container.get('WindowManager');
		const eventSubscriber  = container.get('EventSubscriber');
		const settingsManager  = container.get('SettingsManager');
		const windowPositioner = container.get('WindowPositioner');

		const trayTooltip          = 'Yet Another YouTube Downloader' as const;
		const trayImage            = getExtraResourcePath('tray.ico');
		const trayDownloadingImage = getExtraResourcePath('tray-downloading.ico');

		eventSubscriber.subscribe('setup-finished', () => {
			const tray = new Tray(trayImage);
			const menu = [] as MenuItemConstructorOptions[];

			tray.setToolTip(trayTooltip);

			if (import.meta.env.DEV) {
				menu.push(
					{
						label: 'Developer',
						submenu: [
							{
								label: 'Reset settings',
								click: () => {
									settingsManager.reset();
									app.relaunch();
									app.exit(0);
								}
							},
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
					label: 'Show yay',
					click: () => tray.emit('click')
				},
				{
					type: 'separator'
				},
				{
					label: '&Quit',
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
				tray.setImage(trayDownloadingImage);
				tray.setToolTip(`Downloading ${url}`);
			});

			eventSubscriber.subscribe('download-finished', () => {
				tray.setImage(trayImage);
				tray.setToolTip(trayTooltip);
			});
		});
	}
}
