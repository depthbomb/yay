import semver from 'semver';
import { app } from 'electron';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { IpcService } from '~/services/ipc';
import { HttpService } from '~/services/http';
import { WindowService } from '~/services/window';
import { GithubService } from '~/services/github';
import { CancellationTokenSource } from '~/common';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import { SettingsService } from '~/services/settings';
import { LifecycleService } from '~/services/lifecycle';
import { product, GIT_HASH, ESettingsKey } from 'shared';
import { NotificationBuilder, NotificationsService } from '~/services/notifications';
import { REPO_NAME, REPO_OWNER, USER_AGENT, PRELOAD_PATH, EXTERNAL_URL_RULES } from '~/constants';
import type { BrowserWindow } from 'electron';
import type { Maybe, Nullable } from 'shared';
import type { Endpoints } from '@octokit/types';
import type { IBootstrappable } from '~/common';
import type { HttpClient } from '~/services/http';

type Release = Endpoints['GET /repos/{owner}/{repo}/releases']['response']['data'][number];
type Commits = Endpoints['GET /repos/{owner}/{repo}/commits']['response']['data'];

@injectable()
export class UpdaterService implements IBootstrappable {
	public latestRelease: Nullable<Release>  = null;
	public commits: Nullable<Commits>        = null;
	public latestChangelog: Nullable<string> = null;

	private cts            = new CancellationTokenSource();
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
	) {
		this.httpClient = this.http.getClient('Updater', { userAgent: USER_AGENT });
	}

	public get hasNewRelease() {
		return this.latestRelease !== null;
	}

	public async bootstrap() {
		this.checkInterval = setInterval(async () => await this.checkForUpdates(), 180_000);

		this.ipc.registerHandler('updater<-show-window',                  () => this.showUpdaterWindow());
		this.ipc.registerHandler('updater<-get-latest-release',           () => this.latestRelease);
		this.ipc.registerHandler('updater<-get-latest-changelog',         () => this.latestChangelog);
		this.ipc.registerHandler('updater<-get-commits-since-build',      () => this.commits);
		this.ipc.registerHandler('updater<-check-for-updates',      async () => {
			await this.checkForUpdates(true);
			return this.hasNewRelease;
		});
		this.ipc.registerHandler('updater<-update',               async () => await this.startUpdate());
		this.ipc.registerHandler('updater<-cancel-update',              () => this.cancelUpdate());

		this.lifecycle.events.on('readyPhase', async () => await this.checkForUpdates());
		this.lifecycle.events.on('shutdown',         () => clearInterval(this.checkInterval));
	}

	public async checkForUpdates(manual: boolean = false) {
		this.logger.info('Checking for updates', { manual });

		this.window.emitAll('updater->checking-for-updates');

		try {
			const releases   = await this.github.getRepositoryReleases(REPO_OWNER, REPO_NAME);
			const newRelease = releases.find(r => semver.gt(r.tag_name, product.version));

			if (newRelease) {
				this.latestRelease = newRelease;

				this.logger.info('Found new release', { tag: newRelease.tag_name });

				this.latestChangelog = newRelease.body_html!;
				this.commits         = await this.github.getRepositoryCommits(REPO_OWNER, REPO_NAME, GIT_HASH);

				this.window.emitAll('updater->outdated', { latestRelease: this.latestRelease });

				if (manual) {
					this.showUpdaterWindow();
				} else if (
					this.settings.get(ESettingsKey.EnableNewReleaseToast, true) &&
					!this.isNotified
				) {
					this.logger.debug('Showing update toast notification');

					this.notifications.showNotification(
						new NotificationBuilder()
							.setTitle(`Version ${newRelease.tag_name} is available!`)
							.setLaunch(`${product.urlProtocol}://open-updater`, 'protocol')
					);
				}

				this.isNotified = true;
			} else {
				this.logger.info('No new releases found');
			}
		} catch (err) {
			const { message, stack } = (err as Error);

			this.logger.error('Error while checking for new releases', { error: { message, stack } });
		}
	}

	public async startUpdate() {
		if (!this.latestRelease) {
			this.logger.warn('Tried to start update with no new release?');
			return;
		}

		this.cts = new CancellationTokenSource();

		const token       = this.cts.token;
		const signal      = token.toAbortSignal();
		const downloadUrl = this.latestRelease.assets.find(a => a.browser_download_url.includes('.exe'))!.browser_download_url;

		this.logger.info('Downloading latest release', { downloadUrl });

		const res = await this.httpClient.get(downloadUrl, { signal });
		if (!res.ok) {
			return;
		}

		const onProgress = async (progress: number) => {
			this.window.emit('updater', 'updater->update-step', { message: `Downloading installer... (${progress}%)` });
		}

		const tempPath = join(app.getPath('temp'), 'yay-setup.exe');
		await this.httpClient.downloadWithProgress(res, tempPath, { signal, onProgress });

		if (this.cts.isCancellationRequested) {
			return;
		}

		this.window.emit('updater', 'updater->update-step', { message: 'Running setup...' });

		this.logger.info('Spawning setup process', { setupPath: tempPath });

		const proc = spawn(tempPath, ['/UPDATE', '/SILENT'], { detached: true, shell: false });

		proc.once('spawn', () => app.quit());
		proc.unref();
	}

	public cancelUpdate() {
		this.cts.cancel();
	}

	public showUpdaterWindow() {
		if (this.updaterWindow && !this.updaterWindow.isDestroyed()) {
			this.logger.debug('Destroying previous updater window');
			this.updaterWindow.close();
		}

		this.logger.debug('Creating updater window');

		this.updaterWindow = this.window.createWindow('updater', {
			url: this.window.useRendererRouter('updater'),
			externalUrlRules: EXTERNAL_URL_RULES,
			browserWindowOptions: {
				show: false,
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
			onReadyToShow: () => {
				this.updaterWindow!.show();
			}
		});
	}
}
