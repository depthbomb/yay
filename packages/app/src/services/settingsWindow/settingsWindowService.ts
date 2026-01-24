import { dialog } from 'electron';
import { eventBus } from '~/events';
import { ok, err } from 'shared/ipc';
import { IPCService } from '~/services/ipc';
import { WindowService } from '~/services/window';
import { inject, injectable } from '@needle-di/core';
import { SettingsService } from '~/services/settings';
import { LifecycleService } from '~/services/lifecycle';
import { PRELOAD_PATH, EXTERNAL_URL_RULES } from '~/constants';
import type { BrowserWindow } from 'electron';
import type { IBootstrappable } from '~/common';

@injectable()
export class SettingsWindowService implements IBootstrappable {
	private readonly settingsWindow: BrowserWindow;

	public constructor(
		private readonly lifecycle = inject(LifecycleService),
		private readonly ipc       = inject(IPCService),
		private readonly settings  = inject(SettingsService),
		private readonly window    = inject(WindowService),
	) {
		this.settingsWindow = this.window.createWindow('settings', {
			url: this.window.useRendererRoute('settings'),
			externalURLRules: EXTERNAL_URL_RULES,
			browserWindowOptions: {
				show: false,
				minWidth: 610,
				width: 610,
				minHeight: 520,
				height: 520,
				backgroundColor: '#202223',
				frame: false,
				roundedCorners: false,
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
				this.settingsWindow.hide();
			}
		});
	}

	public async bootstrap() {
		this.ipc.registerHandler('settings<-show-ui', () => this.show());
		this.ipc.registerHandler('settings<-import', async () => {
			const { canceled, filePaths } = await dialog.showOpenDialog(this.settingsWindow, {
				properties: ['openFile'],
				filters: [{
					name: 'JSON',
					extensions: ['json']
				}]
			});

			if (canceled) {
				return ok(false);
			}

			if (!filePaths.length) {
				return err('No file path chosen.');
			}

			const [filepath] = filePaths;

			try {
				await this.settings.importFromFile(filepath);

				this.window.reloadAllWindows();

				return ok(true);
			} catch (e) {
				return err((e as Error).message);
			}
		});
		this.ipc.registerHandler('settings<-export', async () => {
			const { canceled, filePaths } = await dialog.showOpenDialog(this.settingsWindow, {
				properties: ['openDirectory']
			});

			if (canceled) {
				return ok(false);
			}

			if (!filePaths.length) {
				return err('No file path chosen.');
			}

			const [filepath] = filePaths;

			await this.settings.exportToFile(filepath);

			return ok(true);
		});

		eventBus.on('lifecycle:shutdown', () => this.settingsWindow.close());
	}

	public show() {
		this.settingsWindow.show();

		return ok();
	}
}
