import { nativeTheme } from 'electron';
import { getFilePathFromAsar } from '.';

export function getThemedIcon(fileName: string) {
	if (nativeTheme.shouldUseDarkColors) {
		return getFilePathFromAsar(`tray/action-icons/${fileName}`);
	} else {
		return getFilePathFromAsar(`tray/action-icons/light/${fileName}`);
	}
}
