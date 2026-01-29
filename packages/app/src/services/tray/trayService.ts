import { product } from 'shared';
import { eventBus } from '~/events';
import { app, Menu, Tray } from 'electron'
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import { Path } from '@depthbomb/node-common/pathlib';
import { LifecycleService } from '~/services/lifecycle';
import { MainWindowService } from '~/services/mainWindow';
import { getExtraFilePath, getFilePathFromAsar } from '~/common';
import { SettingsWindowService } from '~/services/settingsWindow';
import type { Maybe } from 'shared';
import type { IBootstrappable } from '~/common';
import type { MenuItemConstructorOptions } from 'electron';

@injectable()
export class TrayService implements IBootstrappable {
	public tray: Maybe<Tray>;

	private readonly settingsIcon: Path;
	private readonly showIcon: Path;
	private readonly quitIcon: Path;
	private readonly trayTooltip: string;
	private readonly logoIcon: Path;
	private readonly trayIcon: Path;
	private readonly trayDownloadingIcon: Path;

	public constructor(
		private readonly logger         = inject(LoggingService),
		private readonly lifecycle      = inject(LifecycleService),
		// @ts-expect-error circular type inference
		private readonly mainWindow     = inject(MainWindowService),
		private readonly settingsWindow = inject(SettingsWindowService),
	) {
		this.trayTooltip         = product.description;
		this.logoIcon            = getFilePathFromAsar('tray', 'action-icons', 'logo-16.png');
		this.showIcon            = getFilePathFromAsar('tray', 'action-icons', 'open-in-new.png');
		this.settingsIcon        = getFilePathFromAsar('tray', 'action-icons', 'cog.png');
		this.quitIcon            = getFilePathFromAsar('tray', 'action-icons', 'close.png');
		this.trayIcon            = getFilePathFromAsar('tray', 'tray.ico');
		this.trayDownloadingIcon = getFilePathFromAsar('tray', 'tray-downloading.ico');
	}

	public async bootstrap() {
		eventBus.on('lifecycle:ready-phase', () => {
			this.logger.debug('Creating tray icon');

			this.tray = new Tray(this.trayIcon.toString());
			this.tray.setToolTip(this.trayTooltip);
			this.tray.setContextMenu(Menu.buildFromTemplate(this.createTrayMenu()));
			this.tray.on('click', () => this.mainWindow.showMainWindow());

			eventBus.on('ytdlp:download-started', ({ url }) => {
				this.tray!.setImage(this.trayDownloadingIcon.toString());
				this.tray!.setToolTip(`Downloading ${url}`);
			});

			eventBus.on('ytdlp:download-finished', () => {
				this.tray!.setImage(this.trayIcon.toString());
				this.tray!.setToolTip(this.trayTooltip);
			});
		});
		eventBus.on('lifecycle:shutdown', () => {
			if (this.tray) {
				this.logger.debug('Destroying tray icon');
				this.tray?.destroy();
				this.tray = undefined;
			}
		});
	}

	private createTrayMenu() {
		const menu = [] as MenuItemConstructorOptions[];
		menu.push(
			{
				label: 'yay',
				icon: this.logoIcon.toString(),
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
									Path.from(getExtraFilePath('yt-dlp.exe')).unlink(),
									Path.from(getExtraFilePath('deno.exe')).unlink(),
									Path.from(getExtraFilePath('ffmpeg.exe')).unlink(),
									Path.from(getExtraFilePath('ffprobe.exe')).unlink(),
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
				icon: this.showIcon.toString(),
				click: () => this.tray!.emit('click')
			},
			{
				label: 'Settings',
				icon: this.settingsIcon.toString(),
				click: () => this.settingsWindow.show()
			},
			{
				type: 'separator'
			},
			{
				label: 'Quit',
				icon: this.quitIcon.toString(),
				click: () => this.lifecycle.requestShutdown()
			}
		);

		return menu;
	}
}
