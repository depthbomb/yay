import { Menu } from 'electron';
import { clipboard } from 'electron';
import { isValidHttpUrl } from 'shared';
import type { YtdlpManager } from '~/lib/YtdlpManager';

export class GlobalMenu {
	private menuShown = false;
	private readonly menu: Menu;

	public constructor(
		private readonly ytdlpManager: YtdlpManager
	) {
		this.menu = Menu.buildFromTemplate([
			{
				label: 'Download video from clipboard',
				click: async () => {
					const text = clipboard.readText('clipboard');
					if (!isValidHttpUrl(text)) {
						return;
					}

					await this.ytdlpManager.download(text);
				}
			},
			{
				label: 'Download audio from clipboard',
				click: async () => {
					const text = clipboard.readText('clipboard');
					if (!isValidHttpUrl(text)) {
						return;
					}

					await this.ytdlpManager.download(text, true);
				}
			},
			{ type: 'separator' },
			{
				label: 'Close',
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
}
