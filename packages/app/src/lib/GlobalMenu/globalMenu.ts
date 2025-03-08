import { Menu, shell, clipboard } from 'electron';
import { isValidHttpUrl, SettingsKey } from 'shared';
import type { YtdlpManager } from '~/lib/YtdlpManager';
import type { SettingsManager } from '~/lib/SettingsManager';

export class GlobalMenu {
	private menuShown = false;
	private readonly menu: Menu;

	public constructor(
		private readonly settingsManager: SettingsManager,
		private readonly ytdlpManager: YtdlpManager,
	) {
		this.menu = Menu.buildFromTemplate([
			{
				label: 'Download &video from clipboard',
				accelerator: '',
				click: async () => await this.tryDownloadFromClipboard()
			},
			{
				label: 'Download &audio from clipboard',
				click: async () => await this.tryDownloadFromClipboard(true)
			},
			{ type: 'separator' },
			{
				label: 'Open &download folder',
				click: async () => await shell.openPath(this.settingsManager.get(SettingsKey.DownloadDir))
			},
			{ type: 'separator' },
			{
				label: '&Close',
				click: () => this.menu.closePopup()
			}
		]);
		this.menu.on('menu-will-show', () => this.menuShown = true);
		this.menu.on('menu-will-close', () => this.menuShown = false);
	}

	public showMenu() {
		if (this.menuShown) {
			return;
		}

		this.menu.popup();
	}

	private async tryDownloadFromClipboard(downloadAudio: boolean = false) {
		const text = clipboard.readText('clipboard');
		if (!isValidHttpUrl(text)) {
			return;
		}

		await this.ytdlpManager.download(text, downloadAudio);
	}
}
