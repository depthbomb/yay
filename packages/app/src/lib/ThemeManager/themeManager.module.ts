import { systemPreferences } from 'electron';
import { ThemeManager } from './themeManager';
import type { Container } from '~/lib/Container';

export class ThemeManagerModule {
	public static async bootstrap(container: Container) {
		const windowManager = container.get('WindowManager');
		const themeManager  = new ThemeManager(windowManager);

		container.register('ThemeManager', themeManager);

		systemPreferences.on('accent-color-changed', async () => {
			await themeManager.removeInjectedThemeCSS();
			await themeManager.injectThemeCSS();
		});

		await themeManager.injectThemeCSS();
	}
}
