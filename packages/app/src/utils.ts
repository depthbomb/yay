import os from 'node:os';

export function isWindows11() {
	if (os.platform() !== 'win32') {
		return false;
	}

	const release     = os.release();
	const buildNumber = parseInt(release.split('.')[2], 10);

	return buildNumber >= 22000;
}
