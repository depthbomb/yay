import { app } from 'electron';
import { join } from 'node:path';

export class SettingsFileProvider {
	public get settingsFilePath() {
		return join(app.getPath('userData'), `settings.${import.meta.env.MODE}.json`);
	}
}
