import semver from 'semver';
import { join } from 'node:path';
import { app, shell } from 'electron';
import { spawn } from 'node:child_process';
import { product, IpcChannel } from 'shared';
import { REPO_NAME, REPO_OWNER, USER_AGENT, PRELOAD_PATH } from '~/constants';
import type { Nullable } from 'shared';
import type { BrowserWindow } from 'electron';
import type { Github, Release,  } from '~/lib/Github';
import type { WindowManager } from '~/lib/WindowManager';
import type { HttpClient, HttpClientManager } from '~/lib/HttpClientManager';

export class Updater {
	private abort          = new AbortController();
	private aborted        = false;
	private isStartupCheck = true;

	private readonly http: HttpClient;

	public latestRelease: Nullable<Release>       = null;
	public updaterWindow: Nullable<BrowserWindow> = null;

	public constructor(
		private readonly httpClientManager: HttpClientManager,
		private readonly windowManager: WindowManager,
		private readonly github: Github,
	) {
		this.http = this.httpClientManager.getClient('Updater', { userAgent: USER_AGENT });
	}

	public async checkForUpdates() {
		const releases   = await this.github.getRepositoryReleases(REPO_OWNER, REPO_NAME);
		const newRelease = releases.find(r => semver.gt(r.tag_name, product.version));
		if (newRelease) {
			this.latestRelease = newRelease;

			/**
			 * If this is the first time checking for updates (immediately after setup) then show
			 * the updater window.
			 */
			if (this.isStartupCheck) {
				this.showUpdaterWindow();
			}

			this.windowManager.emitMain(IpcChannel.Updater_Outdated, this.latestRelease);
		}

		this.isStartupCheck = false;
	}

	public async startUpdate() {
		if (!this.latestRelease) {
			return;
		}

		this.abort   = new AbortController();
		this.aborted = false;

		const { signal }  = this.abort;
		const downloadUrl = this.latestRelease.assets[0].browser_download_url;
		const res         = await this.http.get(downloadUrl, { signal });
		if (!res.ok) {
			return;
		}

		const onProgress = async (progress: number) => {
			this.windowManager.emit('updater', IpcChannel.Updater_Step, `Downloading installer... (${progress}%)`);
		}

		const tempPath = join(app.getPath('temp'), `${Date.now()}.exe`);
		await this.http.downloadWithProgress(res, tempPath, { signal, onProgress });

		if (this.aborted) {
			return;
		}

		this.windowManager.emit('updater', IpcChannel.Updater_Step, 'Running setup...');

		const proc = spawn(tempPath, ['/update=yes'], { detached: true, shell: false });

		proc.once('spawn', () => app.exit(0));
		proc.unref();
	}

	public cancelUpdate() {
		this.aborted = true;
		this.abort.abort();
	}

	public showUpdaterWindow() {
		if (this.updaterWindow && !this.updaterWindow.isDestroyed()) {
			this.updaterWindow.close();
		}

		this.updaterWindow = this.windowManager.createWindow('updater', {
			url: this.windowManager.resolveRendererHTML('updater.html'),
			browserWindowOptions: {
				width: 800,
				minWidth: 800,
				height: 500,
				minHeight: 500,
				backgroundColor: '#000',
				webPreferences: {
					spellcheck: false,
					enableWebSQL: false,
					nodeIntegration: true,
					devTools: import.meta.env.DEV,
					preload: PRELOAD_PATH,
				}
			},
		});

		this.updaterWindow.webContents.setWindowOpenHandler(({ url }) => {
			const { protocol } = new URL(url);
			if (protocol === 'https:' || protocol === 'http:') {
				shell.openExternal(url);
			}

			return { action: 'deny' };
		});

		if (import.meta.env.DEV) {
			this.updaterWindow.webContents.openDevTools({ mode: 'detach' });
		}
	}
}
