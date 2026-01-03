import { dirname } from 'node:path';
import { CLIService } from '~/services/cli';
import { IPCService } from '~/services/ipc';
import { TrayService } from '~/services/tray';
import { RestService } from '~/services/rest';
import { SetupService } from '~/services/setup';
import { YtdlpService } from '~/services/ytdlp';
import { TimerService } from '~/services/timer';
import { WindowService } from '~/services/window';
import { LoggingService } from '~/services/logging';
import { UpdaterService } from '~/services/updater';
import { ThemingService } from '~/services/theming';
import { TwitterService } from '~/services/twitter';
import { inject, injectable } from '@needle-di/core';
import { SettingsService } from '~/services/settings';
import { DeepLinksService } from '~/services/deepLinks';
import { AutoStartService } from '~/services/autoStart';
import { ThumbnailService } from '~/services/thumbnail';
import { MainWindowService } from '~/services/mainWindow';
import { GlobalMenuService } from '~/services/globalMenu';
import { app, shell, dialog, BrowserWindow } from 'electron';
import { FeatureFlagsService } from '~/services/featureFlags';
import { SettingsWindowService } from '~/services/settingsWindow';
import { ELifecyclePhase, LifecycleService } from '~/services/lifecycle';

@injectable()
export class MainService {
	public constructor(
		private readonly cli            = inject(CLIService),
		private readonly logger         = inject(LoggingService),
		private readonly lifecycle      = inject(LifecycleService),
		private readonly ipc            = inject(IPCService),
		private readonly timer          = inject(TimerService),
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
		private readonly rest           = inject(RestService),
		private readonly thumbnail      = inject(ThumbnailService),
		private readonly theming        = inject(ThemingService),
		private readonly twitter        = inject(TwitterService),
	) {}

	public async boot() {
		this.logger.info('Bootstrapping services');

		await Promise.all([
			this.lifecycle.bootstrap(),
			this.settings.bootstrap(),
			this.featureFlags.bootstrap(),
			this.autoStart.bootstrap(),
			this.timer.bootstrap(),
			this.window.bootstrap(),
			this.ytdlp.bootstrap(),
			this.globalMenu.bootstrap(),
			this.deepLinks.bootstrap(),
			this.tray.bootstrap(),
			this.mainWindow.bootstrap(),
			this.settingsWindow.bootstrap(),
			this.setup.bootstrap(),
			this.updater.bootstrap(),
			this.rest.bootstrap(),
			this.thumbnail.bootstrap(),
			this.theming.bootstrap(),
			this.twitter.bootstrap(),
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

		this.ipc.registerHandler('main<-open-app-dir', async () => {
			const path = dirname(app.getPath('exe'));

			this.logger.debug('Opening application folder', { path });

			await shell.openPath(path);
		});

		this.ipc.registerHandler('main<-open-app-data', async () => {
			const path = app.getPath('userData');

			this.logger.debug('Opening application data folder', { path });

			await shell.openPath(path);
		});

		this.ipc.registerHandler('main<-open-external-url', async (_e, url) => shell.openExternal(url));

		if (!this.lifecycle.shutdownInProgress) {
			this.lifecycle.phase = ELifecyclePhase.Ready;

			await this.deepLinks.handleDeepLinks(this.cli.args._);
		}
	}
}
