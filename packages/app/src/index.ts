import { join } from 'node:path';
import { product } from 'shared';
import { app, Menu } from 'electron';

app.setPath('userData', join(app.getPath('appData'), product.author, product.dirName));
app.commandLine.appendSwitch('wm-window-animations-disabled');

if (import.meta.env.DEV) {
	import('@swc-node/sourcemap-support').then(({ installSourceMapSupport }) => installSourceMapSupport());
}

Menu.setApplicationMenu(null);

app.whenReady().then(async () => {
	if (__WIN32__) {
		app.setAppUserModelId(product.appUserModelId);
	}

	const lib       = await import('~/lib');
	const container = lib.containerModule.bootstrap();

	lib.CliModule.bootstrap(container);
	lib.WindowManagerModule.bootstrap(container);
	lib.IpcModule.bootstrap(container);
	lib.AutoStartModule.bootstrap(container);
	lib.EventEmitterModule.bootstrap(container);
	lib.EventSubscriberModule.bootstrap(container);
	lib.SettingsManagerModule.bootstrap(container);
	lib.HttpClientManagerModule.bootstrap(container);
	lib.GithubModule.bootstrap(container);
	lib.WindowPositionerModule.bootstrap(container);

	lib.YtdlpManagerModule.bootstrap(container);
	lib.GlobalMenuModule.bootstrap(container);
	lib.DeepLinksModule.bootstrap(container);
	lib.TrayManagerModule.bootstrap(container);

	await lib.MainWindowModule.bootstrap(container);
	await lib.ThemeManagerModule.bootstrap(container);
	await lib.SetupModule.bootstrap(container);
});
