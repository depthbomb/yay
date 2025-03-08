import { join } from 'node:path';
import { product } from 'shared';
import { app, Menu } from 'electron';

app.setPath('userData', join(app.getPath('appData'), product.author, product.dirName));

if (import.meta.env.DEV) {
	import('@swc-node/sourcemap-support').then(({ installSourceMapSupport }) => installSourceMapSupport());
}

Menu.setApplicationMenu(null);

app.whenReady().then(async () => {
	if (__WIN32__) {
		app.setAppUserModelId(product.appUserModelId);
	}

	const lib            = await import('~/lib');
	const moduleRegistry = lib.ModuleRegistryModule.bootstrap();

	lib.CliModule.bootstrap(moduleRegistry);
	lib.WindowManagerModule.bootstrap(moduleRegistry);
	lib.IpcModule.bootstrap(moduleRegistry);
	lib.AutoStartModule.bootstrap(moduleRegistry);
	lib.EventEmitterModule.bootstrap(moduleRegistry);
	lib.EventSubscriberModule.bootstrap(moduleRegistry);
	lib.SettingsManagerModule.bootstrap(moduleRegistry);
	lib.HttpClientManagerModule.bootstrap(moduleRegistry);
	lib.GithubModule.bootstrap(moduleRegistry);
	lib.WindowPositionerModule.bootstrap(moduleRegistry);
	lib.YtdlpManagerModule.bootstrap(moduleRegistry);
	lib.GlobalMenuModule.bootstrap(moduleRegistry);
	lib.DeepLinksModule.bootstrap(moduleRegistry);
	lib.TrayManagerModule.bootstrap(moduleRegistry);

	await lib.MainWindowModule.bootstrap(moduleRegistry);
	await lib.ThemeManagerModule.bootstrap(moduleRegistry);
	await lib.SetupModule.bootstrap(moduleRegistry);
});
