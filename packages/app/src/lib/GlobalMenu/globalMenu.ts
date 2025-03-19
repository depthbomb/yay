import { getExtraResourcePath } from '~/utils';
import { Menu, shell, clipboard } from 'electron';
import { isValidHttpUrl, SettingsKey } from 'shared';
import type { YtdlpManager } from '~/lib/YtdlpManager';
import type { SettingsManager } from '~/lib/SettingsManager';
import type { MenuItem, MenuItemConstructorOptions } from 'electron';

type MenuTemplate = Array<(MenuItemConstructorOptions) | (MenuItem)>;

export class GlobalMenu {
	private menuShown = false;
	private menu: Menu;

	private readonly logoIcon               = getExtraResourcePath('tray/action-icons/logo-16.png');
	private readonly videoIcon              = getExtraResourcePath('tray/action-icons/video.png');
	private readonly audioIcon              = getExtraResourcePath('tray/action-icons/music-note.png');
	private readonly openDownloadFolderIcon = getExtraResourcePath('tray/action-icons/folder-open.png');
	private readonly closeIcon              = getExtraResourcePath('tray/action-icons/close.png');

	public constructor(
		private readonly settingsManager: SettingsManager,
		private readonly ytdlpManager: YtdlpManager,
	) {
		this.menu = Menu.buildFromTemplate(this.createMenu(false));
		this.menu.on('menu-will-show',  () => this.menuShown = true);
		this.menu.on('menu-will-close', () => this.menuShown = false);
	}

	public showMenu() {
		if (this.menuShown) {
			return;
		}

		this.menu.popup();
	}

	public setMenu(disableDownloadActions: boolean) {
		this.menu = Menu.buildFromTemplate(this.createMenu(disableDownloadActions));
	}

	private async tryDownloadFromClipboard(downloadAudio: boolean = false) {
		if (this.ytdlpManager.isBusy) {
			return;
		}

		const text = clipboard.readText('clipboard');
		if (!isValidHttpUrl(text)) {
			return;
		}

		await this.ytdlpManager.download(text, downloadAudio);
	}

	private createMenu(disableDownloadActions: boolean) {
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
				enabled: !disableDownloadActions,
				click: async () => await this.tryDownloadFromClipboard()
			},
			{
				label: 'Download audio from clipboard',
				icon: this.audioIcon,
				enabled: !disableDownloadActions,
				click: async () => await this.tryDownloadFromClipboard(true)
			},
			{ type: 'separator' },
			{
				label: 'Open download folder',
				icon: this.openDownloadFolderIcon,
				click: async () => await shell.openPath(this.settingsManager.get(SettingsKey.DownloadDir))
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
