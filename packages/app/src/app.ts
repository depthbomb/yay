import { join } from 'node:path';
import { parse } from 'smol-toml';
import { app, Menu, shell } from 'electron';
import { Container } from '@needle-di/core';
import { MainService } from '~/services/main';
import { product, ESettingsKey } from 'shared';
import { Path } from '@depthbomb/node-common/pathlib';
import { EXE_PATH, MONOREPO_ROOT_PATH } from './constants';

export class App {
	private readonly container = new Container();

	public constructor() {
		if (import.meta.env.DEV) {
			import('@swc-node/sourcemap-support').then(({ installSourceMapSupport }) => installSourceMapSupport());
		}

		app.setPath('userData', join(app.getPath('appData'), product.author, product.dirName));
		app.commandLine.appendSwitch('disable-features', 'UseEcoQoSForBackgroundProcess');
	}

	public async start() {
		app.setAppUserModelId(product.appUserModelID);

		Menu.setApplicationMenu(null);

		if (!app.requestSingleInstanceLock()) {
			app.quit();
			return;
		}

		this.applyEarlySettings();

		await app.whenReady();
		await this.createDevelopmentShortcut();
		await this.container.get(MainService).boot();
	}

	public stop() {
		app.quit();
	}

	private applyEarlySettings() {
		// Because the settings service is instantiated after the app's `ready` event, we need to
		// load a subset of the config file to do things such as appending command line switches.
		// This needs to be all synchronous as to not start the event loop yet.

		const configFilePath   = new Path(app.getPath('userData'), `yay.${import.meta.env.MODE}.cfg`);
		const configFileExists = configFilePath.existsSync();
		if (configFileExists) {
			const toml   = configFilePath.readTextSync();
			const config = parse(toml);
			if (config?.[ESettingsKey.DisableHardwareAcceleration]?.valueOf()) {
				app.disableHardwareAcceleration();
				app.commandLine.appendSwitch('--disable-software-rasterizer');
				app.commandLine.appendSwitch('--disable-gpu');
			}
		} else {
			configFilePath.touchSync();
		}
	}

	private async createDevelopmentShortcut() {
		if (import.meta.env.PROD) {
			return;
		}

		// This method ensures that a shortcut exists in the start menu so that we can properly test
		// toast notifications during development.

		const shortcutDir    = new Path(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', product.author);
		const shortcutPath   = shortcutDir.joinpath('yay.lnk');
		const shortcutExists = await shortcutPath.exists();
		if (!shortcutExists) {
			await shortcutDir.mkdir({ recursive: true });

			const ok = shell.writeShortcutLink(shortcutPath.toString(), {
				target: EXE_PATH,
				args: `${join(MONOREPO_ROOT_PATH, 'packages', 'app')}`,
				appUserModelId: product.appUserModelID,
				toastActivatorClsid: product.clsid
			});
			if (!ok) {
				console.warn('Failed to create development shortcut');
			}
		}

		app.once('quit', async () => {
			const shortcutContents = await shortcutPath.readText();
			if (shortcutContents.includes('electron.exe')) {
				await shortcutPath.unlink().catch(console.warn);
			}
		});
	}
}
