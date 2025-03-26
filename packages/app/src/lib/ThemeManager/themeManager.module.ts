import { systemPreferences } from 'electron';
import { ThemeManager } from './themeManager';
import type { ModuleRegistry } from '~/lib/ModuleRegistry';

export class ThemeManagerModule {
	public static async bootstrap(moduleRegistry: ModuleRegistry) {
		const eventSubscriber = moduleRegistry.get('EventSubscriber');
		const windowManager   = moduleRegistry.get('WindowManager');
		const themeManager    = new ThemeManager(eventSubscriber, windowManager);

		systemPreferences.on('accent-color-changed', async () => {
			await themeManager.removeInjectedThemeCSS();
			await themeManager.injectThemeCSS();
		});

		await themeManager.injectThemeCSS();
	}
}
