import { app } from 'electron';
import { eventBus } from '~/events';
import { ok, err } from 'shared/ipc';
import { rm, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { spawn } from 'node:child_process';
import { IPCService } from '~/services/ipc';
import { HTTPService } from '~/services/http';
import { finished } from 'node:stream/promises';
import { TimerService } from '~/services/timer';
import { GithubService } from '~/services/github';
import { WindowService } from '~/services/window';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import { Path } from '@depthbomb/node-common/pathlib';
import { SettingsService } from '~/services/settings';
import { product, GIT_HASH, ESettingsKey } from 'shared';
import { getAssetSHA256, isNewerStableRelease, isTrustedReleaseAssetURL, isTrustedReleaseDownloadURL, parseChecksumText } from './updaterValidation';
import { NotificationBuilder, NotificationsService } from '~/services/notifications';
import { REPO_NAME, REPO_OWNER, USER_AGENT, PRELOAD_PATH, EXTERNAL_URL_RULES } from '~/constants';
import type { BrowserWindow } from 'electron';
import type { IBootstrappable } from '~/common';
import type { HTTPClient } from '~/services/http';
import type { GitHubCommit, GitHubRelease, GitHubReleaseAsset, IPCResult, Nullable, Unit } from 'shared';

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1_000;
const MANUAL_CHECK_INTERVAL_MS = 60_000;
const MAX_INSTALLER_BYTES = 500 * 1024 * 1024;

@injectable()
export class UpdaterService implements IBootstrappable {
	public hasNewRelease = false;

	private latestRelease: Nullable<GitHubRelease> = null;
	private commits: Nullable<GitHubCommit[]> = null;
	private updaterWindow?: BrowserWindow;
	private checkTimeout?: ReturnType<typeof setTimeout>;
	private checkPromise?: Promise<IPCResult<Nullable<GitHubRelease>, string>>;
	private updatePromise?: Promise<IPCResult<Unit, string>>;
	private updateAbort?: AbortController;
	private nextManualCheck = 0;
	private isStartupCheck = true;
	private notifiedVersion?: string;

	private readonly httpClient: HTTPClient;
	private readonly installerAssetName = `${product.applicationName}-setup.exe`;

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
		this.httpClient = this.http.getClient(UpdaterService.name, { userAgent: USER_AGENT });
	}

	public async bootstrap() {
		this.ipc.registerHandler('updater<-check-manual',            () => this.checkForUpdates(true));
		this.ipc.registerHandler('updater<-get-next-manual-check',   () => ok(this.nextManualCheck));
		this.ipc.registerHandler('updater<-show-window',             () => this.showUpdaterWindow());
		this.ipc.registerHandler('updater<-get-latest-release',      () => ok(this.latestRelease));
		this.ipc.registerHandler('updater<-get-commits-since-build', async () => ok(await this.getCommitsSinceBuild()));
		this.ipc.registerHandler('updater<-update',                  () => this.startUpdate());
		this.ipc.registerHandler('updater<-cancel-update',           () => this.cancelUpdate());

		eventBus.once('lifecycle:ready-phase', () => void this.runScheduledCheck());
		eventBus.on('lifecycle:shutdown', () => {
			if (this.checkTimeout) {
				this.timer.clearTimeout(this.checkTimeout);
			}
			this.updateAbort?.abort();
		});
	}

	public async checkForUpdates(manual = false) {
		if (manual) {
			const now = Date.now();
			if (now < this.nextManualCheck) {
				return err(`Please wait until ${new Date(this.nextManualCheck).toLocaleTimeString()} before checking again.`);
			}
			this.nextManualCheck = now + MANUAL_CHECK_INTERVAL_MS;
		}

		const checkPromise = this.checkPromise ?? this.performUpdateCheck().finally(() => {
				this.checkPromise = undefined;
			});
		this.checkPromise = checkPromise;

		const result = await checkPromise;
		if (result.isOk && result.data) {
			if (manual || this.isStartupCheck) {
				this.showUpdaterWindow();
				this.notifiedVersion = result.data.tag_name;
			} else if (
				this.settings.get(ESettingsKey.EnableNewReleaseToast, true)
				&& this.notifiedVersion !== result.data.tag_name
			) {
				this.notifications.showNotification(
					new NotificationBuilder()
						.setTitle(`Version ${result.data.tag_name} is available!`)
						.setLaunch(`${product.urlProtocol}://open-updater`, 'protocol')
				);
				this.notifiedVersion = result.data.tag_name;
			}
		}

		this.isStartupCheck = false;
		return result;
	}

	public startUpdate() {
		if (!this.updatePromise) {
			this.updatePromise = this.performUpdate().finally(() => {
				this.updatePromise = undefined;
				this.updateAbort = undefined;
			});
		}

		return this.updatePromise;
	}

	public cancelUpdate() {
		this.updateAbort?.abort();
		return ok();
	}

	public async showUpdaterIfAvailable() {
		if (!this.hasNewRelease) {
			await this.checkForUpdates();
		}

		if (this.hasNewRelease) {
			this.showUpdaterWindow();
		}
	}

	public showUpdaterWindow() {
		if (!this.latestRelease || !this.hasNewRelease) {
			return ok();
		}

		if (this.updaterWindow && !this.updaterWindow.isDestroyed()) {
			this.updaterWindow.show();
			this.updaterWindow.focus();
			return ok();
		}

		this.updaterWindow = this.window.createWindow('updater', {
			url: this.window.useRendererRoute('updater'),
			externalURLRules: EXTERNAL_URL_RULES,
			browserWindowOptions: {
				show: false,
				width: 800,
				minWidth: 640,
				height: 500,
				minHeight: 400,
				frame: false,
				backgroundColor: '#191919',
				webPreferences: {
					spellcheck: false,
					enableWebSQL: false,
					nodeIntegration: false,
					contextIsolation: true,
					sandbox: true,
					webSecurity: true,
					devTools: import.meta.env.DEV,
					preload: PRELOAD_PATH,
				}
			},
			onReadyToShow: () => this.updaterWindow?.show(),
		});

		return ok();
	}

	private async performUpdateCheck(): Promise<IPCResult<Nullable<GitHubRelease>, string>> {
		this.logger.info('Checking for application updates');

		try {
			const release = (await this.github.getLatestRepositoryRelease(REPO_OWNER, REPO_NAME, false, AbortSignal.timeout(30_000))) ?? null;
			const remoteVersion = release?.tag_name;
			if (
				!release
				|| !isNewerStableRelease(release, product.version)
			) {
				this.hasNewRelease = false;
				this.latestRelease = null;
				this.commits = null;
				this.logger.info('No new application release found', { latestVersion: remoteVersion });
				return ok(null);
			}

			this.hasNewRelease = true;
			this.latestRelease = release;
			this.commits = null;

			this.logger.info('Found new application release', { tag: remoteVersion });
			this.window.emitAll('updater->outdated', { latestRelease: release });

			return ok(release);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.error('Error while checking for application updates', { error });
			return err(message);
		}
	}

	private async runScheduledCheck() {
		await this.checkForUpdates();
		this.checkTimeout = this.timer.setTimeout(() => void this.runScheduledCheck(), CHECK_INTERVAL_MS);
	}

	private async getCommitsSinceBuild() {
		if (!this.latestRelease) {
			return null;
		}
		if (this.commits) {
			return this.commits;
		}

		try {
			this.commits = await this.github.getRepositoryCommitsBetween(
				REPO_OWNER,
				REPO_NAME,
				GIT_HASH,
				this.latestRelease.tag_name,
				AbortSignal.timeout(30_000),
			);
			return this.commits;
		} catch (error) {
			this.logger.warn('Could not load commits since the current build', { error });
			return null;
		}
	}

	private async performUpdate(): Promise<IPCResult<Unit, string>> {
		const release = this.latestRelease;
		if (!this.hasNewRelease || !release) {
			return err('No application update is available.');
		}

		const installerAsset = release.assets.find(asset => asset.name === this.installerAssetName);
		if (!installerAsset) {
			return err(`Could not find expected installer asset "${this.installerAssetName}".`);
		}
		if (installerAsset.size <= 0 || installerAsset.size > MAX_INSTALLER_BYTES) {
			return err('The installer has an invalid file size.');
		}
		if (!isTrustedReleaseAssetURL(installerAsset.browser_download_url, REPO_OWNER, REPO_NAME)) {
			return err('The installer has an untrusted download URL.');
		}

		this.updateAbort = new AbortController();
		const { signal } = this.updateAbort;
		const tempPathString = new Path(app.getPath('temp'), 'yay-setup.exe').toString();
		const tempPath = new Path(tempPathString);
		let keepInstaller = false;

		try {
			const expectedHash = await this.getExpectedSHA256(release, installerAsset, signal);
			if (!expectedHash) {
				return err(`Could not find a SHA-256 checksum for "${installerAsset.name}".`);
			}

			this.window.emit('updater', 'updater->update-step', { message: 'Downloading installer... (0%)' });
			const response = await this.httpClient.get(installerAsset.browser_download_url, { signal });
			if (!response.ok || !isTrustedReleaseDownloadURL(response.url)) {
				throw new Error(`Installer download failed (${response.status} ${response.statusText})`);
			}

			const contentLength = Number(response.headers.get('content-length'));
			if (Number.isFinite(contentLength) && contentLength > 0 && contentLength !== installerAsset.size) {
				throw new Error('Installer download size does not match the release metadata.');
			}

			await this.httpClient.downloadWithProgress(response, tempPath, {
				signal,
				maxBytes: Math.min(installerAsset.size, MAX_INSTALLER_BYTES),
				onProgress: progress => this.window.emit('updater', 'updater->update-step', {
					message: `Downloading installer... (${progress}%)`
				}),
			});

			this.window.emit('updater', 'updater->update-step', { message: 'Verifying installer...' });
			await this.verifyInstaller(tempPathString, installerAsset, expectedHash);

			this.window.emit('updater', 'updater->update-step', { message: 'Starting installer...' });
			await this.spawnInstaller(tempPathString);
			keepInstaller = true;
			app.quit();

			return ok();
		} catch (error) {
			if (signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
				return ok();
			}

			const message = error instanceof Error ? error.message : String(error);
			this.logger.error('Failed to install application update', { error });
			return err(message);
		} finally {
			if (!keepInstaller) {
				await rm(tempPathString, { force: true }).catch(error => {
					this.logger.warn('Could not remove partial installer', { path: tempPathString, error });
				});
			}
		}
	}

	private async getExpectedSHA256(release: GitHubRelease, installerAsset: GitHubReleaseAsset, signal: AbortSignal) {
		const digest = getAssetSHA256(installerAsset);
		if (digest) {
			return digest;
		}

		const checksumAssetName = `${installerAsset.name}.sha256`;
		const checksumAsset = release.assets.find(asset => asset.name === checksumAssetName);
		if (!checksumAsset || !isTrustedReleaseAssetURL(checksumAsset.browser_download_url, REPO_OWNER, REPO_NAME)) {
			return null;
		}

		const response = await this.httpClient.get(checksumAsset.browser_download_url, {
			signal,
			headers: { accept: 'text/plain' },
		});
		if (!response.ok || !isTrustedReleaseDownloadURL(response.url)) {
			throw new Error(`Could not download installer checksum (${response.status} ${response.statusText})`);
		}

		const checksumText = await response.text();
		if (checksumText.length > 4_096) {
			throw new Error('Installer checksum file is unexpectedly large.');
		}

		return parseChecksumText(checksumText, installerAsset.name);
	}

	private async verifyInstaller(path: string, asset: GitHubReleaseAsset, expectedSHA256: string) {
		const { size } = await stat(path);
		if (size !== asset.size) {
			throw new Error(`Installer size mismatch (expected ${asset.size} bytes, got ${size} bytes).`);
		}

		const hash = createHash('sha256');
		const file = createReadStream(path);
		file.on('data', chunk => hash.update(chunk as Buffer));
		await finished(file);

		if (hash.digest('hex').toLowerCase() !== expectedSHA256) {
			throw new Error('Installer SHA-256 verification failed.');
		}
	}

	private spawnInstaller(path: string) {
		return new Promise<void>((resolve, reject) => {
			const process = spawn(path, ['/UPDATE', '/SILENT'], {
				detached: true,
				shell: false,
				stdio: 'ignore',
			});

			process.once('error', reject);
			process.once('spawn', () => {
				process.unref();
				resolve();
			});
		});
	}

}
