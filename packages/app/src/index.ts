import { join } from 'node:path';
import { product } from 'shared';
import { fileExists } from './utils';
import { Container } from '@needle-di/core';
import { app, Menu, shell } from 'electron';
import { MainService } from './services/main';
import { mkdir, unlink, readFile } from 'node:fs/promises';
import { EXE_PATH, MONOREPO_ROOT_PATH } from './constants';

app.setPath('userData', join(app.getPath('appData'), product.author, product.dirName));

if (import.meta.env.DEV) {
	import('@swc-node/sourcemap-support').then(({ installSourceMapSupport }) => installSourceMapSupport());
}

Menu.setApplicationMenu(null);

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

	const container = new Container();
	await container.get(MainService).boot();
});
