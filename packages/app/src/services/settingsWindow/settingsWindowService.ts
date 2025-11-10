import { IpcService } from '~/services/ipc';
import { WindowService } from '~/services/window';
import { inject, injectable } from '@needle-di/core';
import { LifecycleService } from '~/services/lifecycle';
import { PRELOAD_PATH, EXTERNAL_URL_RULES } from '~/constants';
import type { BrowserWindow } from 'electron';
import type { IBootstrappable } from '~/common';

@injectable()
export class SettingsWindowService implements IBootstrappable {
	private readonly settingsWindow: BrowserWindow;

	public constructor(
		private readonly lifecycle = inject(LifecycleService),
		private readonly ipc       = inject(IpcService),
		private readonly window    = inject(WindowService),
	) {
		this.settingsWindow = this.window.createWindow('settings', {
			url: this.window.useRendererRouter('settings'),
			externalUrlRules: EXTERNAL_URL_RULES,
			browserWindowOptions: {
				show: false,
				minWidth: 600,
				width: 600,
				minHeight: 500,
				height: 500,
				backgroundColor: '#09090b',
				roundedCorners: true,
				webPreferences: {
					spellcheck: false,
					enableWebSQL: false,
					nodeIntegration: true,
					devTools: import.meta.env.DEV,
					preload: PRELOAD_PATH,
				}
			},
			onReadyToShow: () => {
				this.settingsWindow.center();
			},
		});

		this.settingsWindow.on('close', e => {
			if (!this.lifecycle.shutdownInProgress) {
				e.preventDefault();
				this.settingsWindow!.hide();
			}
		});
	}

	public async bootstrap() {
		this.ipc.registerHandler('settings<-show-ui', () => this.show());

		this.lifecycle.events.on('shutdownRequested', () => this.settingsWindow.close());
	}

	public show() {
		this.settingsWindow.show();
	}
}
