import mitt from 'mitt';
import { app } from 'electron';
import { join } from 'node:path';
import { ESettingsKey } from 'shared';
import { safeStorage } from 'electron';
import { IpcService } from '~/services/ipc';
import { StoreService } from '~/services/store';
import { WindowService } from '~/services/window';
import { inject, injectable } from '@needle-di/core';
import type { Maybe } from 'shared';
import type { Settings } from './types';
import type { Store } from '~/services/store';
import type { IBootstrappable } from '~/common';

type SettingsManagerGetOptions = {
	secure?: boolean;
};
type SettingsManagerSetOptions = SettingsManagerGetOptions;

@injectable()
export class SettingsService implements IBootstrappable {
	public readonly events = mitt<{ settingsUpdated: { key: ESettingsKey, value: unknown } }>();

	private readonly internalStore: Store<Settings>;
	private readonly settingsFilePath: string;

	public constructor(
		private readonly ipc    = inject(IpcService),
		private readonly window = inject(WindowService),
		private readonly store  = inject(StoreService),
	) {
		this.settingsFilePath = join(app.getPath('userData'), `yay.${import.meta.env.MODE}.cfg`);
		this.internalStore    = this.store.createStore<Settings>(this.settingsFilePath);
	}

	public async bootstrap() {
		this.ipc.registerSyncHandler(
			'settings<-get',
			(e, key, defaultValue, secure) => e.returnValue = this.get(key, defaultValue, { secure })
		);
		this.ipc.registerHandler(
			'settings<-get',
			(_, key, defaultValue, secure) => this.get(key, defaultValue, { secure })
		);
		this.ipc.registerHandler(
			'settings<-set',
			async (_, key, value, secure) => await this.set(key, value, { secure })
		);
		this.ipc.registerHandler(
			'settings<-reset',
			async () => {
				await this.reset();
				app.relaunch();
				app.exit(0);
			}
		);

		this.events.on('settingsUpdated', ({ key, value }) => this.window.emitAll('settings->changed', { key, value }));
	}

	public get<T>(key: ESettingsKey, defaultValue?: T, options?: SettingsManagerSetOptions) {
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

	public async set<T>(key: ESettingsKey, value: T, options?: SettingsManagerSetOptions) {
		const $value = options?.secure ? this.encryptValue(value) : value;
		await this.internalStore.set(key, $value);

		this.events.emit('settingsUpdated', { key, value });
	}

	public async setDefault<T>(key: ESettingsKey, value: T, options?: SettingsManagerSetOptions) {
		if (this.get(key, null, options) === null) {
			await this.set(key, value, options);
		}
	}

	public async setDefaults(settings: Array<[ESettingsKey, unknown] | [ESettingsKey, unknown, Maybe<SettingsManagerSetOptions>]>): Promise<void>;
	public async setDefaults(settings: Array<[ESettingsKey, unknown]>): Promise<void>;
	public async setDefaults(settings: Array<[ESettingsKey, unknown] | [ESettingsKey, unknown, Maybe<SettingsManagerSetOptions>]>) {
		for (const setting of settings) {
			const [key, value, options = undefined] = setting;
			await this.setDefault(key, value, options);
		}
	}

	public async reload() {
		return this.internalStore.reload();
	}

	public async reset() {
		return this.internalStore.reset();
	}

	private encryptValue(data: unknown) {
		return safeStorage.encryptString(JSON.stringify(data)).toString('base64');
	}

	private decryptValue<T>(encrypted: string) {
		return JSON.parse(safeStorage.decryptString(Buffer.from(encrypted, 'base64'))) as T;
	}
}
