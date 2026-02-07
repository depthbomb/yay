import { App } from './app';
import { dialog } from 'electron';

new App().start().catch((err) => {
	console.error('Unhandled exception during app startup', err);

	dialog.showErrorBox(
		'Unhandled Exception',
		`yay encountered an unhandled exception and needs to close.\n\n${(err as Error).message}\n\nIf this problem persists then try reinstalling yay or submitting an issue: https://github.com/depthbomb/yay/issues/new`
	);

	process.exit(1);
});
