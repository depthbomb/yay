import { join } from 'node:path';
import { ROOT_PATH } from '~/constants';
import { app, BrowserWindow } from 'electron';
import { DEV_PORT, IpcChannel } from 'shared';
import type { Awaitable } from 'shared';
import type { AboutPanelOptionsOptions, BrowserWindowConstructorOptions } from 'electron';

type CreateWindowOptions = {
	/**
	 * URL or local path to contents to load into the window.
	 */
	url: string;
	/**
	 * {@link BrowserWindowConstructorOptions}
	 */
	browserWindowOptions: BrowserWindowConstructorOptions;
	/**
	 * The function to call when the window is ready to be shown.
	 */
	onReadyToShow?: () => Awaitable<void>;
};
type CreateMainWindowOptions = Omit<CreateWindowOptions, 'name'>;

export class WindowManager {
	public readonly windows: Map<string, BrowserWindow>;

	private readonly mainWindowName = 'main' as const;

	public constructor() {
		this.windows = new Map();
	}

	public createMainWindow(options: CreateMainWindowOptions): BrowserWindow {
		if (this.windows.has(this.mainWindowName)) {
			throw new Error('Main window has already been created');
		}

		const { url, browserWindowOptions, onReadyToShow } = options;
		const mainWindow = this.createWindow(this.mainWindowName, { url, browserWindowOptions, onReadyToShow });

		return mainWindow;
	}

	public createWindow(name: string, options: CreateWindowOptions): BrowserWindow {
		const { url, browserWindowOptions, onReadyToShow } = options;

		if (this.windows.has(name)) {
			this.windows.get(name)?.destroy();
			this.windows.delete(name);
		}

		const window = new BrowserWindow(browserWindowOptions);

		window.once('closed', () => this.windows.delete(name));

		this.windows.set(name, window);

		window.loadURL(url).then(onReadyToShow);

		return window;
	}

	public getWindow(name: string): BrowserWindow | undefined {
		return this.windows.get(name);
	}

	public resolveRendererHTML(indexPath: string): string {
		if (import.meta.env.DEV) {
			return `http://localhost:${DEV_PORT}/${indexPath}`;
		}

		return this.getHTMLPath(indexPath);
	}

	public getHTMLPath(htmlPath: string): string {
		return join(ROOT_PATH, htmlPath);
	}

	public getMainWindow(): BrowserWindow | undefined {
		return this.getWindow(this.mainWindowName);
	}

	public getActiveWindow(): BrowserWindow {
		return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
	}

	public closeAllWindows(force = false): void {
		for (const name in this.windows) {
			const window = this.windows.get(name)!;
			if (force) {
				window.closable = true;
			}

			window.close();
		}
	}

	public showAboutWindow(options: AboutPanelOptionsOptions = {}): void {
		const aboutOptions: AboutPanelOptionsOptions = {
			iconPath: options.iconPath ?? '',
			applicationName: options.applicationName ?? app.getName(),
			applicationVersion: options.applicationVersion ?? app.getVersion(),
			copyright: options.copyright ?? '',
			website: options.website ?? '',
		};

		app.setAboutPanelOptions(aboutOptions);
		app.showAboutPanel();
	}

	public emitMain(channel: IpcChannel, ...args: unknown[]): void {
		this.emit(this.mainWindowName, channel, ...args);
	}

	public emit(windowName: string, channel: IpcChannel, ...args: unknown[]): void {
		const window = this.getWindow(windowName);

		window?.webContents.send(channel, ...args);
	}

	public emitAll(channel: IpcChannel, ...args: unknown[]): void {
		for (const window of this.windows.values()) {
			window?.webContents.send(channel, ...args);
		}
	}
}
