import { product } from 'shared';
import { unlink } from 'node:fs/promises';
import { app, Menu, Tray } from 'electron';
import { EventsService } from '~/services/events';
import { WindowService } from '~/services/window';
import { inject, injectable } from '@needle-di/core';
import { LifecycleService } from '~/services/lifecycle';
import { getExtraFilePath, getExtraResourcePath } from '~/utils';
import { WindowPositionService } from '~/services/windowPosition';
import type { Maybe } from 'shared';
import type { MenuItemConstructorOptions } from 'electron';
import type { IBootstrappable } from '~/common/IBootstrappable';

@injectable()
export class TrayService implements IBootstrappable {
	private tray: Maybe<Tray>;

	private readonly trayTooltip: string;
	private readonly logoIcon: string;
	private readonly showIcon: string;
	private readonly quitIcon: string;
	private readonly trayIcon: string;
	private readonly trayDownloadingIcon: string;

	public constructor(
		private readonly lifecycle      = inject(LifecycleService),
		private readonly events         = inject(EventsService),
		private readonly window         = inject(WindowService),
		private readonly windowPosition = inject(WindowPositionService),
	) {
		this.trayTooltip         = product.description;
		this.logoIcon            = getExtraResourcePath('tray/action-icons/logo-16.png');
		this.showIcon            = getExtraResourcePath('tray/action-icons/open-in-new.png');
		this.quitIcon            = getExtraResourcePath('tray/action-icons/close.png');
		this.trayIcon            = getExtraResourcePath('tray/tray.ico');
		this.trayDownloadingIcon = getExtraResourcePath('tray/tray-downloading.ico');
	}

	public async bootstrap() {
		this.lifecycle.events.on('readyPhase', () => {
			this.tray = new Tray(this.trayIcon);
			this.tray.setToolTip(this.trayTooltip);

			const menu = [] as MenuItemConstructorOptions[];

			menu.push(
				{
					label: 'yay',
					icon: this.logoIcon,
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
									app.quit();
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
					icon: this.showIcon,
					click: () => this.tray!.emit('click')
				},
				{
					type: 'separator'
				},
				{
					label: 'Quit',
					icon: this.quitIcon,
					click: () => app.quit()
				}
			);

			this.tray.setContextMenu(Menu.buildFromTemplate(menu));
			this.tray.on('click', () => {
				const mainWindow = this.window.getMainWindow()!;
				this.windowPosition.setWindowPositionAtTray(mainWindow, this.tray!);
				mainWindow.show();
				mainWindow.focus();
			});

			this.events.subscribe('download-started', url => {
				this.tray!.setImage(this.trayDownloadingIcon);
				this.tray!.setToolTip(`Downloading ${url}`);
			});

			this.events.subscribe('download-finished', () => {
				this.tray!.setImage(this.trayIcon);
				this.tray!.setToolTip(this.trayTooltip);
			});
		});
		this.lifecycle.events.on('shutdown', () => {
			if (this.tray) {
				this.tray?.destroy();
				this.tray = undefined;
			}
		});
	}
}
