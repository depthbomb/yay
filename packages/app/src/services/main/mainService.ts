import { TrayService } from '~/services/tray';
import { SetupService } from '~/services/setup';
import { YtdlpService } from '~/services/ytdlp';
import { WindowService } from '~/services/window';
import { UpdaterService } from '~/services/updater';
import { inject, injectable } from '@needle-di/core';
import { SettingsService } from '~/services/settings';
import { DeepLinksService } from '~/services/deepLinks';
import { AutoStartService } from '~/services/autoStart';
import { GlobalMenuService } from '~/services/globalMenu';
import { SettingsWindowService } from '~/services/settingsWindow';
import { LifecyclePhase, LifecycleService } from '~/services/lifecycle';
import { MainWindowService } from '~/services/mainWindow/mainWindowService';

@injectable()
export class MainService {
	public constructor(
		private readonly lifecycle      = inject(LifecycleService),
		private readonly window         = inject(WindowService),
		private readonly autoStart      = inject(AutoStartService),
		private readonly settings       = inject(SettingsService),
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
		Promise.allSettled([
			this.lifecycle.bootstrap(),
			this.settings.bootstrap(),
			this.autoStart.bootstrap(),
			this.window.bootstrap(),
			this.ytdlp.bootstrap(),
			this.globalMenu.bootstrap(),
			this.deepLinks.bootstrap(),
			this.tray.bootstrap(),
			this.mainWindow.bootstrap(),
			this.settingsWindow.bootstrap(),
			this.setup.performSetupActions(),
			this.updater.bootstrap(),
		])
		.then(() => this.lifecycle.phase = LifecyclePhase.Ready);
	}
}
