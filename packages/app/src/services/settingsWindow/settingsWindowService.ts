import { IpcChannel } from 'shared';
import { PRELOAD_PATH } from '~/constants';
import { IpcService } from '~/services/ipc';
import { windowOpenHandler } from '~/utils';
import { WindowService } from '~/services/window';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import { LifecycleService } from '~/services/lifecycle';
import type { Maybe } from 'shared';
import type { BrowserWindow } from 'electron';
import type { IBootstrappable } from '~/common/IBootstrappable';

@injectable()
export class SettingsWindowService implements IBootstrappable {
	private settingsWindow: Maybe<BrowserWindow>;

	public constructor(
		private readonly lifecycle = inject(LifecycleService),
		private readonly logger    = inject(LoggingService),
		private readonly ipc       = inject(IpcService),
		private readonly window    = inject(WindowService),
	) {}

	public async bootstrap(): Promise<void> {
		this.ipc.registerHandler(IpcChannel.Settings_ShowUi, () => this.show());

		this.lifecycle.events.on('shutdown', () => this.settingsWindow?.close());
	}

	public show() {
		if (this.settingsWindow) {
			this.settingsWindow.show();
		} else {
			this.logger.debug('Creating settings window');
			this.settingsWindow = this.window.createWindow('settings', {
				url: this.window.resolveRendererHTML('settings.html'),
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
				}
			});

			this.settingsWindow.on('close', e => {
				if (!this.lifecycle.shutdownRequested) {
					e.preventDefault();
					this.settingsWindow!.hide();
				}
			});

			this.settingsWindow.webContents.setWindowOpenHandler(windowOpenHandler);

			this.settingsWindow.center();
			this.settingsWindow.show();
		}
	}
}
