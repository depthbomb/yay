import mitt from 'mitt';
import { ok } from 'shared/ipc';
import { join } from 'node:path';
import { IPCService } from '~/services/ipc';
import { app, safeStorage } from 'electron';
import { product, ESettingsKey } from 'shared';
import { StoreService } from '~/services/store';
import { WindowService } from '~/services/window';
import { inject, injectable } from '@needle-di/core';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Maybe } from 'shared';
import type { Settings } from './types';
import type { Store } from '~/services/store';
import type { IBootstrappable } from '~/common';

type SettingsManagerGetOptions = {
	secure?: boolean;
};
type SettingsManagerSetOptions = SettingsManagerGetOptions;
type ExportedSettings = {
	date: Date;
	appVersion: string;
	checksum: string;
	data: string;
}

@injectable()
export class SettingsService implements IBootstrappable {
	public readonly events = mitt<{ settingsUpdated: { key: ESettingsKey, value: unknown } }>();

	private readonly internalStore: Store<Settings>;
	private readonly settingsFilePath: string;

	public constructor(
		private readonly ipc    = inject(IPCService),
		private readonly window = inject(WindowService),
		private readonly store  = inject(StoreService),
	) {
		this.settingsFilePath = join(app.getPath('userData'), `yay.${import.meta.env.MODE}.cfg`);
		this.internalStore    = this.store.createStore<Settings>(this.settingsFilePath);
	}

	public async bootstrap() {
		this.ipc.registerSyncHandler('settings<-get', (e, key, defaultValue, secure) => e.returnValue = ok(this.get(key, defaultValue, { secure })));
		this.ipc.registerHandler('settings<-get', (_, key, defaultValue, secure) => ok(this.get(key, defaultValue, { secure })));
		this.ipc.registerHandler('settings<-set', (_, key, value, secure) => {
			this.set(key, value, { secure });

			return ok();
		});
		this.ipc.registerHandler('settings<-reset',
			async () => {
				await this.reset();
				app.relaunch();
				app.exit(0);

				return ok();
			}
		);

		this.events.on('settingsUpdated', ({ key, value }) => this.window.emitAll('settings->changed', { key, value }));
	}

	public get<T>(key: ESettingsKey, defaultValue?: T, options?: SettingsManagerSetOptions) : T {
		const value = this.internalStore.get(key);
		if (value === undefined) {
			return defaultValue as T;
		}

		if (options?.secure) {
			if (typeof value === 'string') {
				return this.decryptValue<T>(value);
			}

			return defaultValue as T;
		} else {
			return value as T;
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

	public async apply(data: object) {
		return this.internalStore.apply(data);
	}

	public async reload() {
		return this.internalStore.reload();
	}

	public async reset() {
		return this.internalStore.reset();
	}

	public async importFromFile(filepath: string) {
		const json = await readFile(filepath, 'utf8');

		let parsed: ExportedSettings;
		try {
			parsed = JSON.parse(json) as ExportedSettings;
		} catch {
			throw new Error('Invalid exported settings file: malformed JSON');
		}

		if (typeof parsed.data !== 'string' || typeof parsed.checksum !== 'string') {
			throw new Error('Invalid exported settings file: missing or invalid fields.');
		}

		const expected = createHash('sha512').update(parsed.data).digest();
		const actual   = Buffer.from(parsed.checksum, 'base64');
		if (expected.length !== actual.length) {
			throw new Error('Settings data may be corrupted or tampered with.');
		}

		if (!timingSafeEqual(expected, actual)) {
			throw new Error('Settings data may be corrupted or tampered with.');
		}

		await this.apply(JSON.parse(parsed.data));
	}

	public async exportToFile(filepath: string) {
		const date = new Date();
		const data = JSON.stringify(this.internalStore.store);
		const hash = createHash('sha512').update(data).digest('base64');
		const json = JSON.stringify({ date, appVersion: product.version, checksum: hash, data });
		const path = join(filepath, 'yay-exported-settings.json');

		await writeFile(path, json, 'utf8');

		return path;
	}

	private encryptValue(data: unknown) {
		return safeStorage.encryptString(JSON.stringify(data)).toString('base64');
	}

	private decryptValue<T>(encrypted: string) {
		return JSON.parse(safeStorage.decryptString(Buffer.from(encrypted, 'base64'))) as T;
	}
}
