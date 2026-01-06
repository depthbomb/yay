import semver from 'semver';
import { app } from 'electron';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { IPCService } from '~/services/ipc';
import { HTTPService } from '~/services/http';
import { TimerService } from '~/services/timer';
import { WindowService } from '~/services/window';
import { GithubService } from '~/services/github';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import { SettingsService } from '~/services/settings';
import { LifecycleService } from '~/services/lifecycle';
import { product, GIT_HASH, ESettingsKey } from 'shared';
import { CancellationTokenSource } from '@depthbomb/node-common';
import { TransformableNumber } from '~/common/TransformableNumber';
import { NotificationBuilder, NotificationsService } from '~/services/notifications';
import { REPO_NAME, REPO_OWNER, USER_AGENT, PRELOAD_PATH, EXTERNAL_URL_RULES } from '~/constants';
import type { BrowserWindow } from 'electron';
import type { Maybe, Nullable } from 'shared';
import type { Endpoints } from '@octokit/types';
import type { IBootstrappable } from '~/common';
import type { HTTPClient } from '~/services/http';

type Commits = Endpoints['GET /repos/{owner}/{repo}/commits']['response']['data'];

@injectable()
export class UpdaterService implements IBootstrappable {
	public hasNewRelease                     = false;
	public commits: Nullable<Commits>        = null;
	public latestChangelog: Nullable<string> = null;

	private cts        = new CancellationTokenSource();
	private isNotified = false;
	private checkTimeout: Maybe<NodeJS.Timeout>;
	private updaterWindow: Maybe<BrowserWindow>;
	private nextManualCheck = Date.now();

	private readonly httpClient: HTTPClient;
	private readonly checkInterval       = new TransformableNumber(30_000, x => x + 15_000);
	private readonly manualCheckInterval = new TransformableNumber(5_000, x => x + 5_000);

	public constructor(
		private readonly logger        = inject(LoggingService),
		private readonly lifecycle     = inject(LifecycleService),
		private readonly ipc           = inject(IPCService),
		private readonly timer         = inject(TimerService),
		private readonly window        = inject(WindowService),
		private readonly settings      = inject(SettingsService),
		private readonly http          = inject(HTTPService),
		private readonly github        = inject(GithubService),
		private readonly notifications = inject(NotificationsService),
	) {
		this.httpClient = this.http.getClient('Updater', { userAgent: USER_AGENT });
		this.checkForUpdates();
		this.scheduleNextUpdateCheck();
	}

	public async bootstrap() {
		this.ipc.registerHandler('updater<-check-manual',            () => this.checkForUpdates(true));
		this.ipc.registerHandler('updater<-get-next-manual-check',   () => this.nextManualCheck);
		this.ipc.registerHandler('updater<-show-window',             () => this.showUpdaterWindow());
		this.ipc.registerHandler('updater<-get-latest-release',      () => this.getLatestRelease());
		this.ipc.registerHandler('updater<-get-latest-changelog',    () => this.latestChangelog);
		this.ipc.registerHandler('updater<-get-commits-since-build', () => this.commits);
		this.ipc.registerHandler('updater<-update',                  () => this.startUpdate());
		this.ipc.registerHandler('updater<-cancel-update',           () => this.cancelUpdate());

		this.lifecycle.events.on('readyPhase', () => this.checkForUpdates());
		this.lifecycle.events.on('shutdown',   () => this.timer.clearTimeout(this.checkTimeout!));
	}

	public async checkForUpdates(manual = false) {
		this.logger.info('Checking for updates', { manual });

		this.window.emitAll('updater->checking-for-updates');

		if (manual) {
			this.nextManualCheck = Date.now() + this.manualCheckInterval.value;
		}

		try {
			const release = await this.getLatestRelease();
			if (release && semver.gt(release.tag_name, product.version)) {
				this.hasNewRelease = true;

				this.logger.info('Found new release', { tag: release.tag_name });

				this.latestChangelog = release.body_html!;
				this.commits         = await this.github.getRepositoryCommits(REPO_OWNER, REPO_NAME, GIT_HASH);

				this.window.emitAll('updater->outdated', { latestRelease: release });

				if (
					this.settings.get(ESettingsKey.EnableNewReleaseToast, true) &&
					!this.isNotified
				) {
					this.logger.debug('Showing update toast notification');

					this.notifications.showNotification(
						new NotificationBuilder()
							.setTitle(`Version ${release.tag_name} is available!`)
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
		if (!this.hasNewRelease) {
			this.logger.warn('Tried to start update with no new release?');
			return;
		}

		this.cts = new CancellationTokenSource();

		const release = await this.getLatestRelease();
		if (!release) {
			this.logger.warn('Tried to start update with no release data?');
			return;
		}

		const token       = this.cts.token;
		const signal      = token.toAbortSignal();
		const downloadURL = release.assets.find(a => a.browser_download_url.includes('.exe'))!.browser_download_url;

		this.logger.info('Downloading latest release', { downloadURL });

		const res = await this.httpClient.get(downloadURL, { signal });
		if (!res.ok) {
			return;
		}

		const onProgress = (progress: number) => {
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

	public async getLatestRelease() {
		return this.github.getLatestRepositoryRelease(REPO_OWNER, REPO_NAME);
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
			url: this.window.useRendererRoute('updater'),
			externalURLRules: EXTERNAL_URL_RULES,
			browserWindowOptions: {
				show: false,
				width: 800,
				minWidth: 800,
				height: 500,
				minHeight: 500,
				frame: false,
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

	private scheduleNextUpdateCheck() {
		this.checkTimeout = this.timer.setTimeout(async () => {
			await this.checkForUpdates();
			this.scheduleNextUpdateCheck();
		}, this.checkInterval.value);
	}
}
