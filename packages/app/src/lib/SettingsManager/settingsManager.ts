import { SettingsKey } from 'shared';
import { safeStorage } from 'electron';
import type { Settings } from './types/Settings';
import type { EventEmitter } from '~/lib/EventEmitter';
import type { SettingsReader } from './settingsReader';
import type { SettingsWriter } from './settingsWriter';

type SettingsManagetGetOptions = {
	secure?: boolean;
};
type SettingsManagetSetOptions = SettingsManagetGetOptions;

export class SettingsManager {
	public settings: Settings;

	public constructor(
		private readonly settingsReader: SettingsReader,
		private readonly settingsWriter: SettingsWriter,
		private readonly eventEmitter: EventEmitter
	) {
		this.settings = this.settingsReader.readSync();
	}

	public get<T>(key: SettingsKey, defaultValue?: T, options?: SettingsManagetGetOptions) {
		if (key in this.settings) {
			const value = this.settings[key];

			return (!!options?.secure ? this.decryptValue(value as string) : value) as T;
		}

		return defaultValue as T;
	}

	public async set<T>(key: SettingsKey, value: T, options?: SettingsManagetSetOptions) {
		this.settings[key] = !!options?.secure ? this.encryptValue(value) : value;
		this.eventEmitter.emit('settings-updated', { key, value });

		await this.save();
	}

	public async reload() {
		this.settings = await this.settingsReader.read();
	}

	public async reset() {
		for (const key of Object.keys(this.settings)) {
			delete this.settings[key as keyof Settings];
		}

		await this.save();
	}

	private encryptValue(data: unknown) {
		return safeStorage.encryptString(JSON.stringify(data)).toString('base64');
	}

	private decryptValue<T>(encrypted: string) {
		return JSON.parse(safeStorage.decryptString(Buffer.from(encrypted, 'base64'))) as T;
	}

	private async save() {
		await this.settingsWriter.write(this.settings);
	}
}
