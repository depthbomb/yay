import { join } from 'node:path';
import { app } from 'electron';
import { safeStorage } from 'electron';
import { PRELOAD_PATH } from '~/constants';
import { IpcService } from '~/services/ipc';
import { StoreService } from '~/services/store';
import { IpcChannel, SettingsKey } from 'shared';
import { EventsService } from '~/services/events';
import { WindowService } from '~/services/window';
import { unlink, readFile } from 'node:fs/promises';
import { inject, injectable } from '@needle-di/core';
import { fileExists, windowOpenHandler } from '~/utils';
import type { Maybe } from 'shared';
import type { Settings } from './types';
import type { Store } from '~/services/store';
import type { BrowserWindow } from 'electron';
import type { IBootstrappable } from '~/common/IBootstrappable';

type SettingsManagetGetOptions = {
	secure?: boolean;
};
type SettingsManagetSetOptions = SettingsManagetGetOptions;

@injectable()
export class SettingsService implements IBootstrappable {
	private settingsWindow: Maybe<BrowserWindow>;

	private readonly internalStore: Store<Settings>;
	private readonly settingsFilePath: string;
	private readonly legacySettingsFilePath: string;
	private readonly deprecatedSettings: string[];

	public constructor(
		private readonly ipc    = inject(IpcService),
		private readonly events = inject(EventsService),
		private readonly window = inject(WindowService),
		private readonly store  = inject(StoreService),
	) {
		this.settingsFilePath       = join(app.getPath('userData'), `yay.${import.meta.env.MODE}.cfg`);
		this.legacySettingsFilePath = join(app.getPath('userData'), `settings.${import.meta.env.MODE}.json`);
		this.internalStore          = this.store.createStore<Settings>(this.settingsFilePath);
		this.deprecatedSettings     = [
			'show-window-frame'
		];
	}

	public async bootstrap() {
		//#region IPC
		this.ipc.registerSyncHandler(
			IpcChannel.Settings_Get,
			(e, key, defaultValue, secure) => e.returnValue = this.get(key, defaultValue, { secure })
		);
		this.ipc.registerHandler(
			IpcChannel.Settings_Get,
			(_, key, defaultValue, secure) => this.get(key, defaultValue, { secure })
		);
		this.ipc.registerHandler(
			IpcChannel.Settings_Set,
			async (_, key, value, secure) => await this.set(key, value, { secure })
		);
		this.ipc.registerHandler(
			IpcChannel.Settings_Reset,
			async () => {
				await this.reset();
				app.relaunch();
				app.exit(0);
			}
		);
		this.ipc.registerHandler(
			IpcChannel.Settings_ShowUi,
			() => {
				if (this.settingsWindow) {
					this.settingsWindow.show();
				} else {
					this.settingsWindow = this.window.createWindow('settings', {
						url: this.window.resolveRendererHTML('settings.html'),
						browserWindowOptions: {
							show: false,
							minWidth: 600,
							width: 600,
							minHeight: 500,
							height: 500,
							backgroundColor: '#09090b',
							roundedCorners: false,
							webPreferences: {
								spellcheck: false,
								enableWebSQL: false,
								nodeIntegration: true,
								devTools: import.meta.env.DEV,
								preload: PRELOAD_PATH,
							}
						}
					});

					if (import.meta.env.DEV) {
						this.settingsWindow?.webContents.openDevTools({ mode: 'detach' });
					}

					this.settingsWindow.on('close', e => {
						e.preventDefault();
						this.settingsWindow!.hide();
					});

					this.settingsWindow.webContents.setWindowOpenHandler(windowOpenHandler);

					this.settingsWindow.center();
					this.settingsWindow.show();
				}
			}
		);
		//#endregion

		this.events.subscribe('settings-updated', ({ key, value }) => this.window.emitAll(IpcChannel.Settings_Changed, key, value));
	}

	public get<T>(key: SettingsKey, defaultValue?: T, options?: SettingsManagetGetOptions) {
		const value = this.internalStore.get(key, defaultValue);
		if (options?.secure) {
			if (value) {
				return this.decryptValue<T>(value as string);
			}

			return defaultValue as T;
		} else {
			return value;
		}
	}

	public async set<T>(key: SettingsKey, value: T, options?: SettingsManagetSetOptions) {
		const $value = options?.secure ? this.encryptValue(value) : value;
		await this.internalStore.set(key, $value);

		this.events.emit('settings-updated', { key, value });
	}

	public async setDefault<T>(key: SettingsKey, value: T, options?: SettingsManagetSetOptions) {
		if (this.get(key, null, options) === null) {
			await this.set(key, value, options);
		}
	}

	public async reload() {
		return this.internalStore.reload();
	}

	public async reset() {
		return this.internalStore.reset();
	}

	public async migrateLegacySettings() {
		const hasLegacySettings = await fileExists(this.legacySettingsFilePath);
		if (hasLegacySettings) {
			const json = await readFile(this.legacySettingsFilePath, 'utf8');
			const data = JSON.parse(json);
			await this.internalStore.apply(data);
			await unlink(this.legacySettingsFilePath);
		}
	}

	public async removeDeprecatedSettings() {
		for (const key of this.deprecatedSettings) {
			delete this.internalStore.store[key as SettingsKey];
		}

		await this.internalStore.save();
	}

	private encryptValue(data: unknown) {
		return safeStorage.encryptString(JSON.stringify(data)).toString('base64');
	}

	private decryptValue<T>(encrypted: string) {
		return JSON.parse(safeStorage.decryptString(Buffer.from(encrypted, 'base64'))) as T;
	}
}
