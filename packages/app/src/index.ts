import { App } from './app';
import { dialog } from 'electron';

new App().start().catch((err) => {
	console.error('Unhandled exception during app startup', err);

	dialog.showErrorBox(
		'Unhandled Exception',
		'yay encountered an unhandled exception and needs to close.\n\n' + (err as Error).message
	);

	process.exit(1);
});
