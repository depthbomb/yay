import { shell } from 'electron';
import type { SystemPreferencesWindowsPane } from '~/@types';

/**
 * Opens a specific settings pane on Windows 10+ systems.
 *
 * @param pane The Windows settings pane to open
 */
export async function openSystemSettings(pane: SystemPreferencesWindowsPane) {
	await shell.openExternal(`ms-settings:${pane}`);
}
