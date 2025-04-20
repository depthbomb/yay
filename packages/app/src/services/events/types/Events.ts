import type { SettingsKey } from 'shared';
import type { BrowserWindow } from 'electron';

export type Events = {
	'settings-updated': { key: SettingsKey, value: unknown };
	'download-started': string;
	'download-finished': void;
	'window-created': BrowserWindow;
	'show-updater': void;
};
