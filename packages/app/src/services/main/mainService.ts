import { join } from 'node:path';
import { IpcChannel } from 'shared';
import { IpcService } from '~/services/ipc';
import { TrayService } from '~/services/tray';
import { SetupService } from '~/services/setup';
import { YtdlpService } from '~/services/ytdlp';
import { WindowService } from '~/services/window';
import { app, Menu, shell, dialog } from 'electron';
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
import { LifecyclePhase, LifecycleService } from '~/services/lifecycle';
import type { MessageBoxOptions, MenuItemConstructorOptions } from 'electron';

@injectable()
export class MainService {
	public constructor(
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
		this.logger.info('Session started');

		this.featureFlags.set('0196518a-ab04-74b7-b69f-98f85176382a', 'Enable seasonal logos', true);
		this.featureFlags.set('ed25052a-531e-4147-b91c-5b123adf0fe7', 'Enable new tray context menu', false);

		this.logger.info('Bootstrapping services');

		await Promise.allSettled([
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

		this.ipc.registerHandler(IpcChannel.ShowMessageBox, async (_, options: MessageBoxOptions) => {
			this.logger.debug('Showing messagebox', { options });
			return dialog.showMessageBox(this.window.getMainWindow()!, options);
		});

		this.ipc.registerHandler(IpcChannel.ShowTextSelectionMenu, async (_, type: 'input' | 'input-selection' | 'text-selection') => {
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

		this.ipc.registerHandler(IpcChannel.Main_OpenLogFile, async () => {
			const path = join(app.getPath('userData'), 'logs', 'yay.log');

			this.logger.debug('Opening log file in default application', { path });

			await shell.openPath(path);
		});

		this.ipc.registerHandler(IpcChannel.Main_OpenAppData, async () => {
			const path = app.getPath('userData')

			this.logger.debug('Opening application data folder', { path });

			await shell.openPath(path);
		});

		this.lifecycle.phase = LifecyclePhase.Ready;
	}
}
