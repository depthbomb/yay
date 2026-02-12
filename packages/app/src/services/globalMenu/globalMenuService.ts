import { ok } from 'shared/ipc';
import { eventBus } from '~/events';
import { IPCService } from '~/services/ipc';
import { PRELOAD_PATH, } from '~/constants';
import { YtdlpService } from '~/services/ytdlp';
import { WindowService } from '~/services/window';
import { isValidURL, ESettingsKey } from 'shared';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import { SettingsService } from '~/services/settings';
import { LifecycleService } from '~/services/lifecycle';
import { shell, screen, clipboard, globalShortcut } from 'electron';
import type { BrowserWindow } from 'electron';
import type { IBootstrappable } from '~/common';

const accelerator = 'Super+Y' as const;

@injectable()
export class GlobalMenuService implements IBootstrappable {
	private menuShown = false;
	private readonly globalMenuWindow: BrowserWindow;

	public constructor(
		private readonly logger    = inject(LoggingService),
		private readonly lifecycle = inject(LifecycleService),
		private readonly ipc       = inject(IPCService),
		private readonly window    = inject(WindowService),
		private readonly settings  = inject(SettingsService),
		private readonly ytdlp     = inject(YtdlpService),
	) {
		this.globalMenuWindow = this.window.createWindow('global-menu', {
			url: this.window.useRendererRoute('global-menu'),
			browserWindowOptions: {
				show: false,
				width: 210,
				height: 110,
				resizable: false,
				closable: false,
				frame: false,
				skipTaskbar: !import.meta.env.DEV,
				alwaysOnTop: true,
				webPreferences: {
					spellcheck: false,
					enableWebSQL: false,
					nodeIntegration: false,
					contextIsolation: true,
					sandbox: false,
					webSecurity: true,
					devTools: import.meta.env.DEV,
					preload: PRELOAD_PATH,
				}
			}
		});

		this.globalMenuWindow.on('blur', () => this.hideMenu());
		this.globalMenuWindow.on('close', e => {
			if (!this.lifecycle.shutdownInProgress) {
				e.preventDefault();
				this.globalMenuWindow.hide();
			}
		});
	}

	public async bootstrap() {
		this.ipc.registerHandler('global-menu<-open-download-dir', async () => {
			await shell.openPath(this.settings.get(ESettingsKey.DownloadDir));
			return ok();
		});
		this.ipc.registerHandler('global-menu<-download-from-clipboard', async (_, audio) => {
			await this.tryDownloadFromClipboard(audio);
			return ok();
		});

		const callback = () => this.showMenu();
		if (this.settings.get(ESettingsKey.EnableGlobalMenu) === true) {
			eventBus.on('lifecycle:ready-phase', () => globalShortcut.register(accelerator, callback));
		}

		eventBus.on('lifecycle:shutdown', () => {
			this.globalMenuWindow.closable = true;
			this.globalMenuWindow.close();
		});

		eventBus.on('settings:updated', (key, value) => {
			if (key === ESettingsKey.EnableGlobalMenu) {
				if (value === true) {
					globalShortcut.register(accelerator, callback);
				} else {
					globalShortcut.unregister(accelerator);
				}
			}
		});
	}

	public showMenu() {
		if (this.menuShown) {
			this.hideMenu();
			return;
		}

		this.menuShown = true;
		this.logger.trace('Showing global menu');

		const { x, y } = screen.getCursorScreenPoint();

		this.globalMenuWindow.setPosition(x, y);
		this.globalMenuWindow.show();
	}

	public hideMenu() {
		if (!this.menuShown) {
			return;
		}

		this.menuShown = false;
		this.logger.trace('Hiding global menu');
		this.globalMenuWindow.hide();
	}

	private async tryDownloadFromClipboard(downloadAudio = false) {
		this.hideMenu();

		if (this.ytdlp.isBusy) {
			return;
		}

		const text = clipboard.readText('clipboard');
		if (!isValidURL(text)) {
			this.logger.debug('Invalid URL in clipboard, ignoring');
			return;
		}

		await this.ytdlp.download(text, downloadAudio);
	}
}
