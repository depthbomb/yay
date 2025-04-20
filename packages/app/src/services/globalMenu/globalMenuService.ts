import { globalShortcut } from 'electron';
import { IpcService } from '~/services/ipc';
import { getExtraResourcePath } from '~/utils';
import { YtdlpService } from '~/services/ytdlp';
import { Menu, shell, clipboard } from 'electron';
import { inject, injectable } from '@needle-di/core';
import { SettingsService } from '~/services/settings';
import { LifecycleService } from '~/services/lifecycle';
import { IpcChannel, SettingsKey, isValidHttpUrl } from 'shared';
import type { IBootstrappable } from '~/common/IBootstrappable';
import type { MenuItem, MenuItemConstructorOptions } from 'electron';

type MenuTemplate = Array<(MenuItemConstructorOptions) | (MenuItem)>;

const accelerator = 'Super+Y' as const;

@injectable()
export class GlobalMenuService implements IBootstrappable {
	private menuShown = false;
	private menu: Menu;

	private readonly logoIcon               = getExtraResourcePath('tray/action-icons/logo-16.png');
	private readonly videoIcon              = getExtraResourcePath('tray/action-icons/video.png');
	private readonly audioIcon              = getExtraResourcePath('tray/action-icons/music-note.png');
	private readonly openDownloadFolderIcon = getExtraResourcePath('tray/action-icons/folder-open.png');
	private readonly closeIcon              = getExtraResourcePath('tray/action-icons/close.png');

	public constructor(
		private readonly lifecycle = inject(LifecycleService),
		private readonly ipc       = inject(IpcService),
		private readonly settings  = inject(SettingsService),
		private readonly ytdlp     = inject(YtdlpService),
	) {
		this.menu = Menu.buildFromTemplate(this.createMenu(false));
		this.menu.on('menu-will-show',  () => this.menuShown = true);
		this.menu.on('menu-will-close', () => this.menuShown = false);
	}

	public async bootstrap() {
		const callback = () => this.showMenu();
		const enableGlobalMenu = async () => {
			globalShortcut.register(accelerator, callback);
			await this.settings.set(SettingsKey.EnableGlobalMenu, true);

			return true;
		};
		const disableGlobalMenu = async () => {
			globalShortcut.unregister(accelerator);
			await this.settings.set(SettingsKey.EnableGlobalMenu, false);

			return false;
		};
		const toggleGlobalMenu = async () => {
			if (globalShortcut.isRegistered(accelerator)) {
				return disableGlobalMenu();
			} else {
				return enableGlobalMenu();
			}
		};

		if (this.settings.get(SettingsKey.EnableGlobalMenu) === true) {
			this.lifecycle.events.on('readyPhase', () => globalShortcut.register(accelerator, callback));
		}

		this.ipc.registerHandler(IpcChannel.GlobalMenu_Enable,  enableGlobalMenu);
		this.ipc.registerHandler(IpcChannel.GlobalMenu_Disable, disableGlobalMenu);
		this.ipc.registerHandler(IpcChannel.GlobalMenu_Toggle,  toggleGlobalMenu);

		this.ytdlp.events.on('downloadStarted',  () => this.setMenu(true));
		this.ytdlp.events.on('downloadFinished', () => this.setMenu(false));
		this.settings.events.on('settingsUpdated', ({ key, value }) => {
			if (key === SettingsKey.EnableGlobalMenu) {
				if (value as boolean) {
					globalShortcut.register(accelerator, callback);
				} else {
					globalShortcut.unregister(accelerator);
				}
			}
		});
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
		if (this.ytdlp.isBusy) {
			return;
		}

		const text = clipboard.readText('clipboard');
		if (!isValidHttpUrl(text)) {
			return;
		}

		await this.ytdlp.download(text, downloadAudio);
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
