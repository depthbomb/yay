import { ok } from 'shared/ipc';
import { dirname } from 'node:path';
import { CLIService } from '~/services/cli';
import { IPCService } from '~/services/ipc';
import { RestService } from '~/services/rest';
import { TrayService } from '~/services/tray';
import { SetupService } from '~/services/setup';
import { TimerService } from '~/services/timer';
import { YtdlpService } from '~/services/ytdlp';
import { WindowService } from '~/services/window';
import { LoggingService } from '~/services/logging';
import { ThemingService } from '~/services/theming';
import { TwitterService } from '~/services/twitter';
import { UpdaterService } from '~/services/updater';
import { inject, injectable } from '@needle-di/core';
import { SettingsService } from '~/services/settings';
import { AutoStartService } from '~/services/autoStart';
import { DeepLinksService } from '~/services/deepLinks';
import { ThumbnailService } from '~/services/thumbnail';
import { GlobalMenuService } from '~/services/globalMenu';
import { MainWindowService } from '~/services/mainWindow';
import { app, shell, dialog, BrowserWindow } from 'electron';
import { FeatureFlagsService } from '~/services/featureFlags';
import { SettingsWindowService } from '~/services/settingsWindow';
import { ELifecyclePhase, LifecycleService } from '~/services/lifecycle';
import type { MessageBoxReturnValue } from 'electron';

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

		if (import.meta.env.DEV) {
			let heartbeatCount = 0;
			this.timer.setInterval(() => this.window.emitAll('main->heartbeat', ++heartbeatCount), 1_000);
		}

		this.ipc.registerHandler('main<-show-message-box', async (e, options) => {
			const window = BrowserWindow.fromWebContents(e.sender);

			this.logger.debug('Showing messagebox', { window, options });

			let messageBoxResult: MessageBoxReturnValue;
			if (window) {
				messageBoxResult = await dialog.showMessageBox(window, options);
			} else {
				messageBoxResult = await dialog.showMessageBox(options);
			}

			return ok(messageBoxResult);
		});

		this.ipc.registerHandler('main<-open-app-dir', async () => {
			const path = dirname(app.getPath('exe'));

			this.logger.debug('Opening application folder', { path });

			await shell.openPath(path);

			return ok();
		});

		this.ipc.registerHandler('main<-open-app-data', async () => {
			const path = app.getPath('userData');

			this.logger.debug('Opening application data folder', { path });

			await shell.openPath(path);

			return ok();
		});

		this.ipc.registerHandler('main<-open-external-url', async (_e, url) => {
			await shell.openExternal(url)
			return ok();
		});

		if (!this.lifecycle.shutdownInProgress) {
			this.lifecycle.phase = ELifecyclePhase.Ready;

			await this.deepLinks.handleDeepLinks(this.cli.args._);
		}
	}
}
