import { YtdlpService } from '~/services/ytdlp';
import { Menu, shell, clipboard } from 'electron';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import { SettingsKey, isValidHttpUrl } from 'shared';
import { SettingsService } from '~/services/settings';
import { nativeTheme, globalShortcut } from 'electron';
import { LifecycleService } from '~/services/lifecycle';
import { getThemedIcon, getFilePathFromAsar } from '~/utils';
import type { IBootstrappable } from '~/common/IBootstrappable';
import type { MenuItem, MenuItemConstructorOptions } from 'electron';

type MenuTemplate = Array<(MenuItemConstructorOptions) | (MenuItem)>;

const accelerator = 'Super+Y' as const;

@injectable()
export class GlobalMenuService implements IBootstrappable {
	private menuShown = false;
	private disableDownloadActions = false;

	private menu: Menu;
	private videoIcon: string;
	private audioIcon: string;
	private openDownloadFolderIcon: string;
	private closeIcon: string;

	private readonly logoIcon = getFilePathFromAsar('tray/action-icons/logo-16.png');

	public constructor(
		private readonly logger    = inject(LoggingService),
		private readonly lifecycle = inject(LifecycleService),
		private readonly settings  = inject(SettingsService),
		private readonly ytdlp     = inject(YtdlpService),
	) {
		this.menu = Menu.buildFromTemplate(this.createMenu());
		this.menu.on('menu-will-show',  () => this.menuShown = true);
		this.menu.on('menu-will-close', () => this.menuShown = false);

		this.videoIcon              = getThemedIcon('video.png');
		this.audioIcon              = getThemedIcon('music-note.png');
		this.openDownloadFolderIcon = getThemedIcon('folder-open.png');
		this.closeIcon              = getThemedIcon('close.png');
	}

	public async bootstrap() {
		const callback = () => this.showMenu();
		if (this.settings.get(SettingsKey.EnableGlobalMenu) === true) {
			this.lifecycle.events.on('readyPhase', () => globalShortcut.register(accelerator, callback));
		}

		this.ytdlp.events.on('downloadStarted',  () => {
			this.disableDownloadActions = true;
			this.setMenu();
		});
		this.ytdlp.events.on('downloadFinished', () => {
			this.disableDownloadActions = false;
			this.setMenu();
		});
		this.settings.events.on('settingsUpdated', ({ key, value }) => {
			if (key === SettingsKey.EnableGlobalMenu) {
				if (value as boolean) {
					globalShortcut.register(accelerator, callback);
				} else {
					globalShortcut.unregister(accelerator);
				}
			}
		});

		/**
		 * Update icons when the theme changes
		 */
		nativeTheme.on('updated', () => {
			this.videoIcon              = getThemedIcon('video.png');
			this.audioIcon              = getThemedIcon('music-note.png');
			this.openDownloadFolderIcon = getThemedIcon('folder-open.png');
			this.closeIcon              = getThemedIcon('close.png');
			this.menu                   = Menu.buildFromTemplate(this.createMenu());
		});
	}

	public showMenu() {
		if (this.menuShown) {
			this.logger.warn('Tried to show menu when it is already visible');
			return;
		}

		this.logger.silly('Showing global menu');

		this.menu.popup();
	}

	public setMenu() {
		this.menu = Menu.buildFromTemplate(this.createMenu());
	}

	private async tryDownloadFromClipboard(downloadAudio: boolean = false) {
		if (this.ytdlp.isBusy) {
			this.logger.warn('Tried to download from clipboard when we are busy?');
			return;
		}

		const text = clipboard.readText('clipboard');
		if (!isValidHttpUrl(text)) {
			this.logger.debug('Invalid URL in clipboard, ignoring');
			return;
		}

		await this.ytdlp.download(text, downloadAudio);
	}

	private createMenu() {
		return [
			{
				label: 'yay',
				icon: this.logoIcon,
				enabled: false,
			},
			{ type: 'separator' },
			{
				label: 'Download video from clipboard',
				icon: this.videoIcon,
				enabled: !this.disableDownloadActions,
				click: async () => await this.tryDownloadFromClipboard()
			},
			{
				label: 'Download audio from clipboard',
				icon: this.audioIcon,
				enabled: !this.disableDownloadActions,
				click: async () => await this.tryDownloadFromClipboard(true)
			},
			{ type: 'separator' },
			{
				label: 'Open download folder',
				icon: this.openDownloadFolderIcon,
				click: async () => await shell.openPath(this.settings.get(SettingsKey.DownloadDir))
			},
			{ type: 'separator' },
			{
				label: 'Close',
				icon: this.closeIcon,
				click: () => this.menu.closePopup()
			}
		] satisfies MenuTemplate;
	}
}
