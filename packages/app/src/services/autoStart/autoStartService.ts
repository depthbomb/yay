import { app } from 'electron';
import { CliService } from '~/services/cli';
import { IpcService } from '~/services/ipc';
import { product, ESettingsKey } from 'shared';
import { inject, injectable } from '@needle-di/core';
import { SettingsService } from '~/services/settings';
import type { IBootstrappable } from '~/common';

@injectable()
export class AutoStartService implements IBootstrappable {
	public constructor(
		private readonly cli      = inject(CliService),
		private readonly ipc      = inject(IpcService),
		private readonly settings = inject(SettingsService),
	) {}

	public async bootstrap() {
		if (this.cli.flags.uninstall) {
			this.setAutoStart(false);
			app.exit(0);
			return;
		}

		this.ipc.registerHandler('autostart<-enable',  () => this.setAutoStart(true));
		this.ipc.registerHandler('autostart<-disable', () => this.setAutoStart(false));
		this.ipc.registerHandler('autostart<-toggle',  () => this.setAutoStart(!this.isAutoStartEnabled()));

		this.settings.events.on('settingsUpdated', ({ key, value }) => {
			if (key === ESettingsKey.AutoStart) {
				this.setAutoStart(value as boolean);
			}
		});
	}

	public isAutoStartEnabled() {
		return app.getLoginItemSettings().executableWillLaunchAtLogin;
	}

	public setAutoStart(openAtLogin: boolean) {
		app.setLoginItemSettings({ name: product.nameLong, openAtLogin, args: ['--autostart'] });

		return openAtLogin;
	}
}
