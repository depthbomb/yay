import { writeFile } from 'node:fs/promises';
import type { Settings } from './types/Settings';
import type { SettingsFileProvider } from './settingsFileProvider';

export class SettingsWriter {
	public constructor(
		private readonly settingsFileProvider: SettingsFileProvider
	) {}

	public async write(settings: Settings): Promise<void> {
		return writeFile(
			this.settingsFileProvider.settingsFilePath,
			JSON.stringify(this.sortSettingsAlphabetically(settings)),
			'utf8'
		);
	}

	private sortSettingsAlphabetically(settings: Settings): Settings {
		const result = {} as Settings;
		for (const key of Object.keys(settings).sort()) {
			result[key as keyof Settings] = settings[key as keyof Settings];
		}

		return result;
	}
}
