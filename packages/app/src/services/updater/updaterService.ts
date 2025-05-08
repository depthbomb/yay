import semver from 'semver';
import { app } from 'electron';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { IpcService } from '~/services/ipc';
import { windowOpenHandler } from '~/utils';
import { HttpService } from '~/services/http';
import { WindowService } from '~/services/window';
import { GithubService } from '~/services/github';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import { SettingsService } from '~/services/settings';
import { MarkdownService } from '~/services/markdown';
import { LifecycleService } from '~/services/lifecycle';
import { product, GIT_HASH, IpcChannel, SettingsKey } from 'shared';
import { REPO_NAME, REPO_OWNER, USER_AGENT, PRELOAD_PATH } from '~/constants';
import { NotificationBuilder, NotificationsService } from '~/services/notifications';
import type { BrowserWindow } from 'electron';
import type { Maybe, Nullable } from 'shared';
import type { Endpoints } from '@octokit/types';
import type { HttpClient } from '~/services/http';
import type { IBootstrappable } from '~/common/IBootstrappable';

type Release = Endpoints['GET /repos/{owner}/{repo}/releases']['response']['data'][number];
type Commits = Endpoints['GET /repos/{owner}/{repo}/commits']['response']['data'];

@injectable()
export class UpdaterService implements IBootstrappable {
	public latestRelease: Nullable<Release>  = null;
	public commits: Nullable<Commits>        = null;
	public latestChangelog: Nullable<string> = null;

	private abort          = new AbortController();
	private aborted        = false;
	private isStartupCheck = true;
	private isNotified     = false;
	private checkInterval: Maybe<NodeJS.Timeout>;
	private updaterWindow: Maybe<BrowserWindow>;

	private readonly httpClient: HttpClient;

	public constructor(
		private readonly logger        = inject(LoggingService),
		private readonly lifecycle     = inject(LifecycleService),
		private readonly ipc           = inject(IpcService),
		private readonly window        = inject(WindowService),
		private readonly settings      = inject(SettingsService),
		private readonly http          = inject(HttpService),
		private readonly github        = inject(GithubService),
		private readonly notifications = inject(NotificationsService),
		private readonly markdown      = inject(MarkdownService),
	) {
		this.httpClient = this.http.getClient('Updater', { userAgent: USER_AGENT });
	}

	public get hasNewRelease() {
		return this.latestRelease !== null;
	}

	public async bootstrap() {
		this.checkInterval = setInterval(async () => await this.checkForUpdates(), 180_000);

		this.ipc.registerHandler(IpcChannel.Updater_ShowWindow,           () => this.showUpdaterWindow());
		this.ipc.registerHandler(IpcChannel.Updater_GetLatestRelease,     () => this.latestRelease);
		this.ipc.registerHandler(IpcChannel.Updater_GetLatestChangelog,   () => this.latestChangelog);
		this.ipc.registerHandler(IpcChannel.Updater_GetCommitsSinceBuild, () => this.commits);
		this.ipc.registerHandler(IpcChannel.Updater_HasNewRelease,        async () => {
			await this.checkForUpdates();
			return this.hasNewRelease;
		});
		this.ipc.registerHandler(IpcChannel.Updater_Update,               async () => await this.startUpdate());
		this.ipc.registerHandler(IpcChannel.Updater_Cancel,               () => this.cancelUpdate());

		this.lifecycle.events.on('readyPhase', async () => await this.checkForUpdates());
		this.lifecycle.events.on('shutdown',   () => clearInterval(this.checkInterval));
	}

	public async checkForUpdates() {
		this.logger.info('Checking for updates');

		try {
			const releases   = await this.github.getRepositoryReleases(REPO_OWNER, REPO_NAME);
			const newRelease = releases.find(r => semver.gt(r.tag_name, product.version));
			if (newRelease) {
				this.latestRelease = newRelease;

				this.logger.info('Found new release', { tag: newRelease.tag_name });

				this.latestChangelog = await this.markdown.parse(newRelease.body!);
				this.commits         = await this.github.getRepositoryCommits(REPO_OWNER, REPO_NAME, GIT_HASH);

				/**
				 * If this is the first time checking for updates (immediately after setup) then show
				 * the updater window.
				 */
				if (this.isStartupCheck) {
					// So we don't show a notification the next time we check
					this.logger.debug('Showing updater window due to startup update check');
					this.isNotified = true;
					this.showUpdaterWindow();
				}

				this.window.emitMain(IpcChannel.Updater_Outdated, this.latestRelease);

				if (
					this.settings.get(SettingsKey.EnableNewReleaseToast, true) &&
					!this.isStartupCheck &&
					!this.isNotified &&
					!this.window.getMainWindow()?.isFocused()
				) {
					this.logger.debug('Showing update toast notification');

					this.notifications.showNotification(
						new NotificationBuilder()
							.setTitle(`Version ${newRelease.tag_name} is available!`)
							.setLaunch(`${product.urlProtocol}://open-updater`, 'protocol')
					);
					this.isNotified = true;
				}
			} else {
				this.logger.info('No new releases found');
			}
		} catch (err) {
			this.logger.error('Error while checking for new releases', { err });
		}

		this.isStartupCheck = false;
	}

	public async startUpdate() {
		if (!this.latestRelease) {
			this.logger.warn('Tried to start update with no new release?');
			return;
		}

		this.abort   = new AbortController();
		this.aborted = false;

		const { signal }  = this.abort;
		const downloadUrl = this.latestRelease.assets[0].browser_download_url;

		this.logger.info('Downloading latest release', { downloadUrl });

		const res = await this.httpClient.get(downloadUrl, { signal });
		if (!res.ok) {
			return;
		}

		const onProgress = async (progress: number) => {
			this.window.emit('updater', IpcChannel.Updater_Step, `Downloading installer... (${progress}%)`);
		}

		const tempPath = join(app.getPath('temp'), 'yay-setup.exe');
		await this.httpClient.downloadWithProgress(res, tempPath, { signal, onProgress });

		if (this.aborted) {
			return;
		}

		this.window.emit('updater', IpcChannel.Updater_Step, 'Running setup...');

		this.logger.info('Spawning setup process', { setupPath: tempPath });

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
			this.logger.debug('Destroying previous updater window');
			this.updaterWindow.close();
		}

		this.logger.debug('Creating updater window');

		this.updaterWindow = this.window.createWindow('updater', {
			url: this.window.resolveRendererHTML('updater.html'),
			browserWindowOptions: {
				width: 800,
				minWidth: 800,
				height: 500,
				minHeight: 500,
				webPreferences: {
					spellcheck: false,
					enableWebSQL: false,
					nodeIntegration: true,
					devTools: import.meta.env.DEV,
					preload: PRELOAD_PATH,
				}
			},
		});

		this.updaterWindow.webContents.setWindowOpenHandler(windowOpenHandler);
	}
}
