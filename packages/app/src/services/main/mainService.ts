import { CliService } from '~/services/cli';
import { IpcService } from '~/services/ipc';
import { TrayService } from '~/services/tray';
import { SetupService } from '~/services/setup';
import { YtdlpService } from '~/services/ytdlp';
import { WindowService } from '~/services/window';
import { LoggingService } from '~/services/logging';
import { UpdaterService } from '~/services/updater';
import { inject, injectable } from '@needle-di/core';
import { SettingsService } from '~/services/settings';
import { DeepLinksService } from '~/services/deepLinks';
import { AutoStartService } from '~/services/autoStart';
import { MainWindowService } from '~/services/mainWindow';
import { GlobalMenuService } from '~/services/globalMenu';
import { FeatureFlagsService } from '~/services/featureFlags';
import { SettingsWindowService } from '~/services/settingsWindow';
import { app, Menu, shell, dialog, BrowserWindow } from 'electron';
import { ELifecyclePhase, LifecycleService } from '~/services/lifecycle';
import type { MenuItemConstructorOptions } from 'electron';

@injectable()
export class MainService {
	public constructor(
		private readonly cli            = inject(CliService),
		private readonly logger         = inject(LoggingService),
		private readonly lifecycle      = inject(LifecycleService),
		private readonly ipc            = inject(IpcService),
		private readonly window         = inject(WindowService),
		private readonly autoStart      = inject(AutoStartService),
		private readonly settings       = inject(SettingsService),
		private readonly featureFlags   = inject(FeatureFlagsService),
		private readonly setup          = inject(SetupService),
		private readonly ytdlp          = inject(YtdlpService),
		private readonly updater        = inject(UpdaterService),
		private readonly tray           = inject(TrayService),
		private readonly globalMenu     = inject(GlobalMenuService),
		private readonly deepLinks      = inject(DeepLinksService),
		private readonly mainWindow     = inject(MainWindowService),
		private readonly settingsWindow = inject(SettingsWindowService),
	) {}

	public async boot() {
		this.logger.info('Bootstrapping services');

		await Promise.all([
			this.lifecycle.bootstrap(),
			this.settings.bootstrap(),
			this.featureFlags.bootstrap(),
			this.autoStart.bootstrap(),
			this.window.bootstrap(),
			this.ytdlp.bootstrap(),
			this.globalMenu.bootstrap(),
			this.deepLinks.bootstrap(),
			this.tray.bootstrap(),
			this.mainWindow.bootstrap(),
			this.settingsWindow.bootstrap(),
			this.setup.bootstrap(),
			this.updater.bootstrap(),
		]);

		this.ipc.registerHandler('main<-show-message-box', async (e, options) => {
			const window = BrowserWindow.fromWebContents(e.sender);

			this.logger.debug('Showing messagebox', { window, options });

			if (window) {
				return dialog.showMessageBox(window, options);
			} else {
				return dialog.showMessageBox(options);
			}
		});

		this.ipc.registerHandler('main<-show-text-selection-menu', async (_e, type) => {
			this.logger.debug('Showing text selection menu', { type });

			const menuItems = [] as MenuItemConstructorOptions[];

			switch (type) {
				case 'input':
					menuItems.push(
						{ role: 'paste' },
					);
					break;
				case 'input-selection':
					menuItems.push(
						{ role: 'cut' },
						{ role: 'copy' },
						{ role: 'paste' },
						{ role: 'selectAll' },
					);
					break;
				case 'text-selection':
					menuItems.push(
						{ role: 'copy' },
						{ role: 'selectAll' },
					);
					break;
			}

			Menu.buildFromTemplate(menuItems).popup();
		});

		this.ipc.registerHandler('main<-open-app-data', async () => {
			const path = app.getPath('userData')

			this.logger.debug('Opening application data folder', { path });

			await shell.openPath(path);
		});

		if (!this.lifecycle.shutdownRequested) {
			this.lifecycle.phase = ELifecyclePhase.Ready;

			await this.deepLinks.handleDeepLinks(this.cli.args._);
		}
	}
}
