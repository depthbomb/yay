import { app } from 'electron';
import { product } from 'shared';

export class AutoStart {
	public isAutoStartEnabled() {
		return app.getLoginItemSettings().executableWillLaunchAtLogin;
	}

	public setAutoStart(openAtLogin: boolean) {
		app.setLoginItemSettings({ name: product.nameLong, openAtLogin });

		return openAtLogin;
	}
}
