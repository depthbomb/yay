import { ok } from 'shared/ipc';
import { dialog } from 'electron';
import { eventBus } from '~/events';
import { ESettingsKey } from 'shared';
import { unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { IPCService } from '~/services/ipc';
import { join, posix, win32 } from 'node:path';
import { Queue } from '@depthbomb/common/queue';
import { WindowService } from '~/services/window';
import { LoggingService } from '~/services/logging';
import { ProcessService } from '~/services/process';
import { inject, injectable } from '@needle-di/core';
import { SettingsService } from '~/services/settings';
import { ThumbnailService } from '~/services/thumbnail';
import { getExtraFilePath, getFilePathFromAsar } from '~/common';
import { NotificationBuilder, NotificationsService } from '~/services/notifications';
import type { IBootstrappable } from '~/common';
import type { ChildProcess } from 'node:child_process';
import type { Nullable, IDownloadSession } from 'shared';

@injectable()
export class YtdlpService implements IBootstrappable {
	private proc: Nullable<ChildProcess> = null;
	private activeSession: Nullable<IDownloadSession> = null;

	private readonly queue             = new Queue<IDownloadSession>();
	private readonly youtubeURLPattern = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;

	public constructor(
		private readonly logger        = inject(LoggingService),
		private readonly ipc           = inject(IPCService),
		private readonly settings      = inject(SettingsService),
		private readonly window        = inject(WindowService),
		private readonly notifications = inject(NotificationsService),
		private readonly thumbnail     = inject(ThumbnailService),
		private readonly process       = inject(ProcessService)
	) {}

	public get isBusy() {
		return !!this.activeSession;
	}

	public async bootstrap() {
		this.ipc.registerHandler('yt-dlp<-download-video',   (_, url: string) => this.enqueue(url));
		this.ipc.registerHandler('yt-dlp<-download-audio',   (_, url: string) => this.enqueue(url, true));
		this.ipc.registerHandler('yt-dlp<-download-default', async (_, url: string) => {
			const defaultAction = this.settings.get(ESettingsKey.DefaultDownloadAction);

			await this.enqueue(url, defaultAction === 'audio');

			return ok();
		});
		this.ipc.registerHandler('yt-dlp<-remove-cookies-file', async () => {
			const cookiesFilePath = this.settings.get<Nullable<string>>(ESettingsKey.CookiesFilePath, null);

			await this.settings.set(ESettingsKey.CookiesFilePath, null);

			if (cookiesFilePath) {
				await unlink(cookiesFilePath);
			}

			return ok();
		});
		this.ipc.registerHandler('yt-dlp<-cancel-download', () => this.cancelDownload(false));
		this.ipc.registerHandler('yt-dlp<-update-binary',   () => this.updateBinary());

		eventBus.on('lifecycle:shutdown', () => this.cancelDownload(true));
	}

	/** @deprecated Prefer enqueue() */
	public async download(url: string, audioOnly = false) {
		return this.enqueue(url, audioOnly);
	}

	public async enqueue(url: string, audioOnly = false) {
		const session = {
			id: crypto.randomUUID(),
			url,
			audioOnly,
			progress: 0,
			cancelled: false,
			success: null
		} satisfies IDownloadSession;

		this.queue.enqueue(session);

		this.window.emitAll('yt-dlp->download-queued', session);
		eventBus.emit('ytdlp:download-queued', session);

		this.tryStartNext();

		return ok();
	}

	public async cancelDownload(shutdown: boolean) {
		if (this.proc) {
			this.logger.info('Killing yt-dlp process', { shutdown });

			await this.process.killProcessTree(this.proc.pid!);

			this.cleanupProcess();

			if (!shutdown) {
				this.window.emitAll('yt-dlp->download-canceled', this.activeSession!);
				this.window.emitAll('yt-dlp->download-finished', this.activeSession!);

				eventBus.emit('ytdlp:download-finished', this.activeSession!);
			}
		}

		return ok();
	}

	public async updateBinary(silent: boolean = false) {
		this.logger.info('Attempting to update yt-dlp binary');
		this.window.emitAll('yt-dlp->updating-binary');

		const { resolve, promise } = Promise.withResolvers<void>();
		const ytDlpPath            = this.settings.get<string>(ESettingsKey.YtdlpPath);
		const proc                 = spawn(ytDlpPath, ['-U']);
		const versionPattern       = /\b\w+@\d{4}\.\d{2}\.\d{2}\b/;

		let wasUpdated    = false;
		let latestVersion = '';

		proc.stdout.on('data', (data: Buffer) => {
			const line = data.toString().trim();
			this.logger.trace(`yt-dlp -U: ${line}`);

			wasUpdated = !line.includes('is up to date');

			const versionMatch = line.match(versionPattern);
			if (versionMatch) {
				latestVersion = versionMatch[0];
			}
		});
		proc.once('close', async code => {
			this.logger.info('yt-dlp update process exited', { code });
			this.window.emitAll('yt-dlp->updated-binary');

			if (!silent) {
				if (wasUpdated) {
					await dialog.showMessageBox({
						type: 'info',
						title: 'yt-dlp update',
						message: `yt-dlp was updated to ${latestVersion}.`
					});
				} else {
					await dialog.showMessageBox({
						type: 'info',
						title: 'yt-dlp update',
						message: `You are using the latest version of yt-dlp (${latestVersion}).`
					});
				}
			}

			resolve();
		});

		await promise;

		return ok();
	}

	private async tryStartNext() {
		if (this.activeSession || this.proc) {
			return;
		}

		const next = this.queue.dequeue();
		if (!next) {
			return;
		}

		this.activeSession           = next;
		this.activeSession.startedAt = Date.now();

		this.window.emitAll('yt-dlp->download-started', next);

		eventBus.emit('ytdlp:download-started', next);

		await this.spawnYtdlp(next);
	}

	private async spawnYtdlp(session: IDownloadSession) {
		const ytDlpPath            = this.settings.get<string>(ESettingsKey.YtdlpPath);
		const downloadNameTemplate = this.settings.get<string>(ESettingsKey.DownloadNameTemplate);
		const downloadDir          = this.settings.get<string>(ESettingsKey.DownloadDir);
		const showNotification     = this.settings.get<boolean>(ESettingsKey.EnableDownloadCompletionToast);
		const ffmpegPath           = getExtraFilePath('ffmpeg.exe');
		const downloadPath         = join(downloadDir, downloadNameTemplate).replaceAll(win32.sep, posix.sep);

		const emitLog = (line: string) => {
			if (line.length > 0) {
				this.window.emitMain('yt-dlp->stdout', { line });
			}
		};

		const youtubeMatch = session.url.match(this.youtubeURLPattern);
		const args         = [];

		if (session.audioOnly) {
			args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
			if (this.settings.get<boolean>(ESettingsKey.UseThumbnailForCoverArt)) {
				args.push('--embed-thumbnail');
			}
		}

		args.push(session.url, '-o', downloadPath, '--ffmpeg-location', ffmpegPath.toString());

		const cookies = this.settings.get<Nullable<string>>(ESettingsKey.CookiesFilePath, null);
		if (cookies) {
			args.push('--cookies', cookies);
		}

		if (this.settings.get(ESettingsKey.SkipYoutubePlaylists)) {
			args.push('--no-playlist');
		}

		if (youtubeMatch) {
			this.thumbnail.downloadThumbnail(youtubeMatch[1]);
		}

		this.logger.info('Spawning yt-dlp', { args });

		this.proc = spawn(ytDlpPath, args);

		const percentPattern = /\b(\d+(?:\.\d+)?)%/;

		this.proc.stdout!.on('data', (buf: Buffer) => {
			const line = buf.toString().trim();

			emitLog(line);

			const match = line.match(percentPattern);
			if (!match) {
				return;
			}

			const percent = Math.min(100, Math.max(0, parseFloat(match[1])));

			session.progress = percent;

			this.window.emitAll('yt-dlp->download-progress', session);
			eventBus.emit('ytdlp:download-progress', session);
		});

		this.proc.stderr!.on('data', (buf: Buffer) => emitLog(buf.toString().trim()));

		this.proc.once('close', code => {
			session.success = code === 0;
			session.finishedAt = Date.now();
			this.finishActive(showNotification, youtubeMatch?.[1], downloadDir);
		});

		this.proc.once('error', err => {
			session.success = false;
			session.finishedAt = Date.now();
			this.logger.error('yt-dlp error', { err });
			this.finishActive(false);
		});
	}

	private async finishActive(showNotification = false, youtubeID?: string, downloadDir?: string) {
		if (!this.activeSession) {
			return;
		}

		const finished = this.activeSession;

		this.window.emitAll('yt-dlp->download-finished', finished);

		eventBus.emit('ytdlp:download-finished', finished);

		if (showNotification && youtubeID && downloadDir && !this.window.getMainWindow()?.isFocused()) {
			const image = (await this.thumbnail.getThumbnail(youtubeID)) ?? getFilePathFromAsar('notifications', 'logo.png');
			this.notifications.showNotification(
				new NotificationBuilder()
					.setTitle('Yet Another YouTube Downloader')
					.addText('Operation Finished!')
					.setImage(image.toString(), 'hero')
					.setAudio('ms-winsoundevent:Notification.IM')
					.addAction('Open Folder', `file:///${downloadDir}`, 'protocol')
			);
		}

		this.cleanupProcess();
		this.activeSession = null;
		this.tryStartNext();
	}

	private cleanupProcess() {
		this.proc?.stdout?.removeAllListeners();
		this.proc?.stderr?.removeAllListeners();
		this.proc?.removeAllListeners();
		this.proc = null;
	}
}
