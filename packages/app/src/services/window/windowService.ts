import mitt from 'mitt';
import { join } from 'node:path';
import { DEV_PORT } from 'shared';
import { ROOT_PATH } from '~/constants';
import { IpcService } from '~/services/ipc';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import { Menu, shell, BrowserWindow } from 'electron';
import type { IBootstrappable } from '~/common';
import type { Awaitable, IIpcEvents } from 'shared';
import type { MenuItemConstructorOptions, BrowserWindowConstructorOptions } from 'electron';

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
	 * Rules to determine if a URL should be opened externally (in the user's default browser).
	 */
	externalURLRules?: Array<(url: URL) => boolean>;
	/**
	 * Whether the window should handle the `context-menu` event with an appropriate menu.
	 */
	handleContextMenu?: boolean;
	/**
	 * The function to call when the window is ready to be shown.
	 */
	onReadyToShow?: () => Awaitable<void>;
};
type CreateMainWindowOptions = Omit<CreateWindowOptions, 'name'>;

@injectable()
export class WindowService implements IBootstrappable {
	public readonly events = mitt<{ windowCreated: BrowserWindow; }>();
	public readonly windows: Map<string, BrowserWindow>;

	private readonly mainWindowName = 'main' as const;

	public constructor(
		private readonly logger = inject(LoggingService),
		private readonly ipc    = inject(IpcService),
	) {
		this.windows = new Map();
	}

	public async bootstrap() {
		this.ipc.registerHandler('window<-minimize', (_, windowName) => {
			const window = this.windows.get(windowName);
			if (window?.isMinimizable()) {
				window?.minimize();
				this.emit(windowName, 'window->is-minimized');
			}
		});

		this.ipc.registerHandler('window<-maximize', (_, windowName) => {
			const window = this.windows.get(windowName);
			if (window?.isMaximized()) {
				window?.unmaximize();
				this.emit(windowName, 'window->is-unmaximized');
			} else {
				window?.maximize();
				this.emit(windowName, 'window->is-maximized');
			}
		});

		this.ipc.registerHandler('window<-close', (_, windowName) => {
			const window = this.windows.get(windowName);
			if (window) {
				window.close();
				this.emitAll('window->is-closed', { windowName });
			}
		});
	}

	public createMainWindow(options: CreateMainWindowOptions) {
		if (this.windows.has(this.mainWindowName)) {
			throw new Error('Main window has already been created');
		}

		const mainWindow = this.createWindow(this.mainWindowName, options);

		return mainWindow;
	}

	public createWindow(name: string, options: CreateWindowOptions) {
		const { url, browserWindowOptions, externalURLRules, onReadyToShow } = options;
		if (this.windows.has(name)) {
			this.windows.get(name)?.destroy();
			this.windows.delete(name);
		}

		const window = new BrowserWindow(browserWindowOptions);

		if (externalURLRules) {
			window.webContents.setWindowOpenHandler(({ url }) => {
				const requestedURL = new URL(url);
				if (externalURLRules.some(r => r(requestedURL))) {
					shell.openExternal(url);
				}

				return { action: 'deny' };
			});
		}

		window.on('minimize', () => this.emit(name, 'window->is-minimized'));
		window.on('maximize', () => this.emit(name, 'window->is-maximized'));
		window.on('unmaximize', () => this.emit(name, 'window->is-unmaximized'));

		if (options.handleContextMenu === true) {
			window.webContents.on('context-menu', (_, params) => {
				console.log(params);
				const template = [] as MenuItemConstructorOptions[];

				if (params.isEditable) {
					if (params.selectionText) {
						template.push(
							{ role: 'cut' },
							{ role: 'copy' },
							{ role: 'paste' },
							{ type: 'separator' },
							{ role: 'selectAll' },
						);
					} else {
						template.push({ role: 'paste' });
					}
				} else if (params.selectionText) {
					template.push(
						{ role: 'copy' },
						{ role: 'selectAll' },
					);
				} else {
					template.push({ role: 'selectAll' });
				}

				if (template.length) {
					Menu.buildFromTemplate(template).popup({ window });
				}
			});
		}

		window.once('closed', () => {
			this.windows.delete(name);
			this.logger.debug('Window closed', { name });
		});

		if (import.meta.env.DEV) {
			window.webContents.on('before-input-event', (_, input) => {
				if (input.type === 'keyUp' && input.key === 'F12') {
					window.webContents.openDevTools({ mode: 'detach' });
				}
			});
		}

		this.windows.set(name, window);

		window.loadURL(url).then(onReadyToShow);

		this.events.emit('windowCreated', window);

		this.logger.debug('Created window', { name, window });

		return window;
	}

	public getWindow(name: string) {
		return this.windows.get(name);
	}

	public useRendererRouter(pageHash: string = '') {
		if (import.meta.env.DEV) {
			return `http://localhost:${DEV_PORT}/renderer.html#${pageHash}`;
		}

		return this.getHTMLPath(`renderer.html#${pageHash}`);
	}

	public getHTMLPath(htmlPath: string) {
		return join(ROOT_PATH, htmlPath);
	}

	public getMainWindow() {
		return this.getWindow(this.mainWindowName);
	}

	public getActiveWindow(): BrowserWindow {
		return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
	}

	public minimizeWindow(windowName: string) {
		this.windows.get(windowName)?.minimize();
	}

	public closeAllWindows(force = false) {
		this.logger.debug('Attempting to close all windows', { force });

		for (const name in this.windows) {
			const window = this.windows.get(name)!;
			if (force) {
				window.closable = true;
			}

			this.logger.debug('Attempting to close window', { name });

			window.close();
		}
	}

	public emitMain<K extends keyof IIpcEvents>(channel: K, ...args: IIpcEvents[K] extends undefined ? [] : [payload: IIpcEvents[K]]) {
		this.emit(this.mainWindowName, channel, ...args);
	}

	public emit<K extends keyof IIpcEvents>(windowName: string, channel: K, ...args: IIpcEvents[K] extends undefined ? [] : [payload: IIpcEvents[K]]) {
		const window = this.getWindow(windowName);
		window?.webContents.send(channel, ...args);
	}

	public emitAll<K extends keyof IIpcEvents>(channel: K, ...args: IIpcEvents[K] extends undefined ? [] : [payload: IIpcEvents[K]]) {
		for (const window of this.windows.values()) {
			window?.webContents.send(channel, ...args);
		}
	}
}
