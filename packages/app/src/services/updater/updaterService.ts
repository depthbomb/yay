import { app } from 'electron';
import { eventBus } from '~/events';
import { ok, err } from 'shared/ipc';
import { stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { IPCService } from '~/services/ipc';
import { HTTPService } from '~/services/http';
import { finished } from 'node:stream/promises';
import { TimerService } from '~/services/timer';
import { WindowService } from '~/services/window';
import { GithubService } from '~/services/github';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import { Path } from '@depthbomb/node-common/pathlib';
import { SettingsService } from '~/services/settings';
import isVersionGreaterThan from 'semver/functions/gt';
import { Flag, product, GIT_HASH, ESettingsKey } from 'shared';
import { TransformableNumber } from '~/common/TransformableNumber';
import { CancellationTokenSource } from '@depthbomb/node-common/cancellation';
import { NotificationBuilder, NotificationsService } from '~/services/notifications';
import { REPO_NAME, REPO_OWNER, USER_AGENT, PRELOAD_PATH, EXTERNAL_URL_RULES } from '~/constants';
import type { BrowserWindow } from 'electron';
import type { IBootstrappable } from '~/common';
import type { HTTPClient } from '~/services/http';
import type { Maybe, Nullable, GitHubCommit, GitHubRelease, GitHubReleaseAsset } from 'shared';

type Commits       = GitHubCommit[];
type LatestRelease = GitHubRelease;
type ReleaseAsset  = GitHubReleaseAsset;

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
	private readonly installerAssetName = `${product.applicationName}-setup.exe`;
	private readonly checkInterval       = new TransformableNumber(30_000, x => x + 15_000);
	private readonly manualCheckInterval = new TransformableNumber(15_000, x => x + 15_000);
	private readonly isStartupCheck      = new Flag(true);

	public constructor(
		private readonly logger        = inject(LoggingService),
		private readonly ipc           = inject(IPCService),
		private readonly timer         = inject(TimerService),
		private readonly window        = inject(WindowService),
		private readonly settings      = inject(SettingsService),
		private readonly http          = inject(HTTPService),
		private readonly github        = inject(GithubService),
		private readonly notifications = inject(NotificationsService),
	) {
		this.httpClient = this.http.getClient('Updater', { userAgent: USER_AGENT });
		this.scheduleNextUpdateCheck();
	}

	public async bootstrap() {
		this.ipc.registerHandler('updater<-check-manual',            () => this.checkForUpdates(true));
		this.ipc.registerHandler('updater<-get-next-manual-check',   () => ok(this.nextManualCheck));
		this.ipc.registerHandler('updater<-show-window',             () => this.showUpdaterWindow());
		this.ipc.registerHandler('updater<-get-latest-release',      () => this.getLatestRelease());
		this.ipc.registerHandler('updater<-get-latest-changelog',    () => ok(this.latestChangelog));
		this.ipc.registerHandler('updater<-get-commits-since-build', () => ok(this.commits));
		this.ipc.registerHandler('updater<-update',                  () => this.startUpdate());
		this.ipc.registerHandler('updater<-cancel-update',           () => this.cancelUpdate());

		eventBus.on('lifecycle:ready-phase', () => this.checkForUpdates());
		eventBus.on('lifecycle:shutdown',   () => this.timer.clearTimeout(this.checkTimeout!));
	}

	public async checkForUpdates(manual = false) {
		this.logger.info('Checking for updates', { manual });

		this.window.emitAll('updater->checking-for-updates');

		if (manual) {
			this.nextManualCheck = Date.now() + this.manualCheckInterval.value;
		}

		try {
			const release = await this.getLatestRelease();
			if (release.isOk && release.data && isVersionGreaterThan(release.data.tag_name, product.version)) {
				this.hasNewRelease = true;

				this.logger.info('Found new release', { tag: release.data.tag_name });

				this.latestChangelog = release.data.body_html!;
				this.commits         = await this.github.getRepositoryCommits(REPO_OWNER, REPO_NAME, GIT_HASH);

				this.window.emitAll('updater->outdated', { latestRelease: release.data });

				if (manual || this.isStartupCheck.isTrue) {
					this.showUpdaterWindow();
				} else if (this.settings.get(ESettingsKey.EnableNewReleaseToast, true) && !this.isNotified) {
					this.logger.debug('Showing update toast notification');
					this.notifications.showNotification(
						new NotificationBuilder()
							.setTitle(`Version ${release.data.tag_name} is available!`)
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

		this.isStartupCheck.setFalse();

		return ok();
	}

	public async startUpdate() {
		if (!this.hasNewRelease) {
			this.logger.warn('Tried to start update with no new release?');
			return ok();
		}

		this.cts = new CancellationTokenSource();

		try {
			const release = await this.getLatestRelease();
			if (release.isErr || !release.data) {
				this.logger.warn('Tried to start update with no release data?');
				return ok();
			}

			const installerAsset = release.data.assets.find(a => a.name === this.installerAssetName);
			if (!installerAsset) {
				const errorMessage = `Could not find expected installer asset "${this.installerAssetName}" in the latest release`;
				this.logger.error(errorMessage);
				return err(errorMessage);
			}

			const token       = this.cts.token;
			const signal      = token.toAbortSignal();
			const downloadURL = installerAsset.browser_download_url;
			const expectedHash = await this.getExpectedSHA256(release.data, installerAsset, signal);
			if (!expectedHash) {
				const errorMessage = `Could not find a SHA-256 checksum for "${installerAsset.name}"`;
				this.logger.error(errorMessage);
				return err(errorMessage);
			}

			this.logger.info('Downloading latest release', { downloadURL });

			const res = await this.httpClient.get(downloadURL, { signal });
			if (!res.ok) {
				return err(res.statusText);
			}

			const onProgress = (progress: number) => {
				this.window.emit('updater', 'updater->update-step', { message: `Downloading installer... (${progress}%)` });
			}

			const tempPath = new Path(app.getPath('temp'), 'yay-setup.exe');
			await this.httpClient.downloadWithProgress(res, tempPath, { signal, onProgress });

			if (this.cts.isCancellationRequested) {
				return ok();
			}

			await this.verifyInstaller(tempPath, installerAsset, expectedHash);

			this.window.emit('updater', 'updater->update-step', { message: 'Running setup...' });

			this.logger.info('Spawning setup process', { setupPath: tempPath });

			const proc = spawn(tempPath.toString(), ['/UPDATE', '/SILENT'], { detached: true, shell: false });

			proc.once('spawn', () => app.quit());
			proc.unref();
		} catch (error) {
			const e = error as Error;
			if (this.cts.isCancellationRequested || e.name === 'AbortError') {
				return ok();
			}

			this.logger.error('Failed to start installer update', { error: { message: e.message, stack: e.stack } });

			return err(e.message);
		}

		return ok();
	}

	public async getLatestRelease() {
		const release = await this.github.getLatestRepositoryRelease(REPO_OWNER, REPO_NAME);
		return ok(release);
	}

	public cancelUpdate() {
		this.cts.cancel();
		return ok();
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
					nodeIntegration: false,
					contextIsolation: true,
					sandbox: false,
					webSecurity: true,
					devTools: import.meta.env.DEV,
					preload: PRELOAD_PATH,
				}
			},
			onReadyToShow: () => {
				this.updaterWindow!.show();
			}
		});

		return ok();
	}

	private scheduleNextUpdateCheck() {
		this.checkTimeout = this.timer.setTimeout(async () => {
			await this.checkForUpdates();
			this.scheduleNextUpdateCheck();
		}, this.checkInterval.value);
	}

	private async getExpectedSHA256(release: LatestRelease, installerAsset: ReleaseAsset, signal: AbortSignal) {
		const checksumAssetName = `${installerAsset.name}.sha256`;
		const checksumAsset     = release.assets.find(a => a.name === checksumAssetName);
		if (checksumAsset) {
			this.logger.debug('Found checksum asset for installer', { checksumAssetName });

			const checksumRes = await this.httpClient.get(checksumAsset.browser_download_url, {
				signal,
				headers: {
					accept: 'text/plain'
				}
			});
			if (!checksumRes.ok) {
				throw new Error(`Could not download checksum asset (${checksumRes.status} ${checksumRes.statusText})`);
			}

			const checksumText = await checksumRes.text();
			const parsed       = this.parseChecksumText(checksumText);
			if (!parsed) {
				throw new Error(`Checksum file "${checksumAssetName}" is invalid`);
			}

			return parsed;
		}

		const digest = this.tryGetDigestSHA256(installerAsset);
		if (digest) {
			this.logger.debug('Using installer digest from GitHub API response');
			return digest;
		}

		return null;
	}

	private parseChecksumText(checksumText: string) {
		const hashMatch = /\b([a-fA-F0-9]{64})\b/.exec(checksumText);
		if (!hashMatch) {
			return null;
		}

		return hashMatch[1].toLowerCase();
	}

	private tryGetDigestSHA256(asset: ReleaseAsset) {
		const digest = asset.digest;
		if (!digest) {
			return null;
		}

		const match = /^sha256:([a-fA-F0-9]{64})$/i.exec(digest.trim());
		if (!match) {
			return null;
		}

		return match[1].toLowerCase();
	}

	private async verifyInstaller(path: Path, asset: ReleaseAsset, expectedSHA256: string) {
		const { size } = await stat(path.toString());
		if (asset.size > 0 && size !== asset.size) {
			throw new Error(`Installer size mismatch (expected ${asset.size} bytes, got ${size} bytes)`);
		}

		const actualSHA256 = await this.getFileSHA256(path);
		if (actualSHA256 !== expectedSHA256.toLowerCase()) {
			throw new Error('Installer SHA-256 verification failed');
		}
	}

	private async getFileSHA256(path: Path) {
		const hash = createHash('sha256');
		const file = createReadStream(path.toString());
		file.on('data', chunk => hash.update(chunk as Buffer));

		await finished(file);

		return hash.digest('hex').toLowerCase();
	}
}
