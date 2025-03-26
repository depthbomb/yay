import { BrowserWindow, systemPreferences } from 'electron';
import type { WindowManager } from '~/lib/WindowManager';
import type { EventSubscriber } from '~/lib/EventSubscriber';

export class ThemeManager {
	private readonly injectedCSS = new Set<string>();
	private readonly systemColorKeys = [
		'3d-dark-shadow',
		'3d-face',
		'3d-highlight',
		'3d-light',
		'3d-shadow',
		'active-border',
		'active-caption',
		'active-caption-gradient',
		'app-workspace',
		'button-text',
		'caption-text',
		'desktop',
		'disabled-text',
		'highlight',
		'highlight-text',
		'hotlight',
		'inactive-border',
		'inactive-caption',
		'inactive-caption-gradient',
		'inactive-caption-text',
		'info-background',
		'info-text',
		'menu',
		'menu-highlight',
		'menubar',
		'menu-text',
		'scrollbar',
		'window',
		'window-frame',
		'window-text',
		'control-background',
		'control',
		'control-text',
		'disabled-control-text',
		'find-highlight',
		'grid',
		'header-text',
		'highlight',
		'keyboard-focus-indicator',
		'label',
		'link',
		'placeholder-text',
		'quaternary-label',
		'scrubber-textured-background',
		'secondary-label',
		'selected-content-background',
		'selected-control',
		'selected-control-text',
		'selected-menu-item-text',
		'selected-text-background',
		'selected-text',
		'separator',
		'shadow',
		'tertiary-label',
		'text-background',
		'text',
		'under-page-background',
		'unemphasized-selected-content-background',
		'unemphasized-selected-text-background',
		'unemphasized-selected-text',
		'window-background',
		'window-frame-text'
	] as const;

	public constructor(
		private readonly eventSubscriber: EventSubscriber,
		private readonly windowManager: WindowManager,
	) {
		this.eventSubscriber.subscribe('window-created', async window => await this.injectThemeCSSIntoWindow(window));
	}

	public async injectThemeCSS(): Promise<void> {
		for (const window of this.windowManager.windows.values()) {
			const key = await window.webContents.insertCSS(this.getThemeClasses());

			this.injectedCSS.add(key);
		}
	}

	public async removeInjectedThemeCSS() {
		for (const window of this.windowManager.windows.values()) {
			for (const key of this.injectedCSS) {
				await window.webContents.removeInsertedCSS(key);
				this.injectedCSS.delete(key);
			}
		}
	}

	public async injectThemeCSSIntoWindow(window: BrowserWindow) {
		const key = await window.webContents.insertCSS(this.getThemeClasses());

		this.injectedCSS.add(key);
	}

	private getThemeClasses() {
		return this.systemColorKeys.map(k => {
			try {
				return `:root,html,body {--os-accent: #${systemPreferences.getAccentColor()};--os-${k}: ${systemPreferences.getColor(k)}};`;
			} catch {
				return '';
			}
		}).join('\n');
	}
}
