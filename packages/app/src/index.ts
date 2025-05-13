import { join } from 'node:path';
import { parse } from 'smol-toml';
import { fileExists } from './utils';
import { Container } from '@needle-di/core';
import { app, Menu, shell } from 'electron';
import { MainService } from './services/main';
import { product, SettingsKey } from 'shared';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, unlink, readFile } from 'node:fs/promises';
import { EXE_PATH, MONOREPO_ROOT_PATH } from './constants';

app.setPath('userData', join(app.getPath('appData'), product.author, product.dirName));

if (import.meta.env.DEV) {
	import('@swc-node/sourcemap-support').then(({ installSourceMapSupport }) => installSourceMapSupport());
}

Menu.setApplicationMenu(null);

/**
 * Because the settings service is instantiated after the app's `ready` event, we need to load a
 * subset of the config file to do things such as appending command line switches
 */
const configFilePath = join(app.getPath('userData'), `yay.${import.meta.env.MODE}.cfg`);
if (existsSync(configFilePath)) {
	const toml   = readFileSync(configFilePath, 'utf8');
	const config = parse(toml);
	if (SettingsKey.DisableHardwareAcceleration in config && config[SettingsKey.DisableHardwareAcceleration] === false) {
		app.disableHardwareAcceleration();
		app.commandLine.appendSwitch('--disable-software-rasterizer');
		app.commandLine.appendSwitch('--disable-gpu');
	}
}

app.commandLine.appendSwitch('disable-features', 'UseEcoQoSForBackgroundProcess');

app.whenReady().then(async () => {
	if (__WIN32__) {
		app.setAppUserModelId(product.appUserModelId);

		/**
		 * This code ensures that a shortcut exists in the start menu so that we can properly test
		 * toast notifications. The code is only called during development because the installation
		 * step takes care of the shortcut for us in production.
		 */
		if (import.meta.env.DEV) {
			const shortcutDir = join(
				app.getPath('appData'),
				'Microsoft',
				'Windows',
				'Start Menu',
				'Programs',
				product.author
			);
			const shortcutPath = join(shortcutDir, 'yay.lnk');
			const shortcutExists = await fileExists(shortcutPath);
			if (!shortcutExists) {
				await mkdir(shortcutDir, { recursive: true });

				shell.writeShortcutLink(shortcutPath, {
					target: EXE_PATH,
					args: `${join(MONOREPO_ROOT_PATH, 'packages', 'app')}`,
					appUserModelId: product.appUserModelId,
					toastActivatorClsid: product.clsid
				});
			}

			app.once('quit', async () => {
				const shortcutContents = await readFile(shortcutPath, 'utf8');
				if (shortcutContents.includes('electron.exe')) {
					await unlink(shortcutPath);
				}
			});
		}
	}

	await new Container().get(MainService).boot();
});
