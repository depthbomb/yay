import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import type { Settings } from './types/Settings';
import type { SettingsFileProvider } from './settingsFileProvider';

export class SettingsReader {
	public constructor(
		private readonly settingsFileProvider: SettingsFileProvider
	) {}

	public async read(): Promise<Settings> {
		try {
			const data = await readFile(this.settingsFileProvider.settingsFilePath, 'utf8');
			const json = JSON.parse(data);

			return json;
		} catch (err: unknown) {
			return {} as Settings;
		}
	}

	public readSync(): Settings {
		try {
			const data = readFileSync(this.settingsFileProvider.settingsFilePath, 'utf8');
			const json = JSON.parse(data);

			return json;
		} catch (err: unknown) {
			return {} as Settings;
		}
	}
}
