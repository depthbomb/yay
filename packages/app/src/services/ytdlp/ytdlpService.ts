import { ok, err } from 'shared/ipc';
import { dialog } from 'electron';
import { eventBus } from '~/events';
import { unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { IPCService } from '~/services/ipc';
import { join, posix, win32 } from 'node:path';
import { isValidURL, ESettingsKey } from 'shared';
import { WindowService } from '~/services/window';
import { LoggingService } from '~/services/logging';
import { ProcessService } from '~/services/process';
import { inject, injectable } from '@needle-di/core';
import { Queue } from '@depthbomb/common/collections';
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

	public async enqueue(url: string, audioOnly = false) {
		if (!isValidURL(url)) {
			this.logger.warn('Rejected download request with invalid URL', { url });
			return ok();
		}

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
		const activeSession = this.activeSession;
		if (!activeSession) {
			return ok();
		}

		if (this.proc) {
			this.logger.info('Killing yt-dlp process', { shutdown });

			try {
				await this.process.killProcessTree(this.proc.pid!);
			} catch (err) {
				this.logger.warn('Failed to kill yt-dlp process tree during cancellation', { err });
			}
		}

		this.cleanupProcess();

		activeSession.cancelled  = true;
		activeSession.success    = false;
		activeSession.finishedAt = Date.now();

		if (!shutdown) {
			this.window.emitAll('yt-dlp->download-canceled', activeSession);
			this.window.emitAll('yt-dlp->download-finished', activeSession);

			eventBus.emit('ytdlp:download-finished', activeSession);
		}

		this.activeSession = null;
		this.tryStartNext();

		return ok();
	}

	public async updateBinary(silent: boolean = false) {
		this.logger.info('Attempting to update yt-dlp binary');
		this.window.emitAll('yt-dlp->updating-binary');

		try {
			const ytDlpPath = this.settings.get<string>(ESettingsKey.YtdlpPath);
			const output    = await this.runBinaryUpdate(ytDlpPath);
			const version   = output.match(/\b(?:stable@)?\d{4}\.\d{2}\.\d{2}(?:\.\d+)?\b/i)?.[0] ?? 'unknown version';
			const updated   = /\b(?:updating to|updated yt-dlp)\b/i.test(output);

			if (!silent) {
				await dialog.showMessageBox({
					type: 'info',
					title: 'yt-dlp update',
					message: updated
						? `yt-dlp was updated to ${version}.`
						: `You are using the latest version of yt-dlp (${version}).`
				});
			}

			return ok();
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.error('Failed to update yt-dlp', { error });

			if (!silent) {
				await dialog.showMessageBox({
					type: 'error',
					title: 'yt-dlp update',
					message: `yt-dlp could not be updated: ${message}`
				});
			}

			return err(message);
		} finally {
			this.window.emitAll('yt-dlp->updated-binary');
		}
	}

	private runBinaryUpdate(ytDlpPath: string, timeoutMs = 120_000) {
		return new Promise<string>((resolve, reject) => {
			const proc = spawn(ytDlpPath, ['-U']);
			let output = '';
			let settled = false;

			const settle = (error?: Error) => {
				if (settled) {
					return;
				}

				settled = true;
				clearTimeout(timeout);
				if (error) {
					reject(error);
				} else {
					resolve(output);
				}
			};
			const appendOutput = (data: Buffer) => {
				const text = data.toString();
				output += text;
				this.logger.trace(`yt-dlp -U: ${text.trim()}`);
			};
			const timeout = setTimeout(() => {
				void this.process.killProcessTree(proc.pid!).catch(error => {
					this.logger.warn('Failed to kill timed-out yt-dlp update process', { error });
				});
				settle(new Error(`Update timed out after ${Math.round(timeoutMs / 1_000)} seconds.`));
			}, timeoutMs);

			proc.stdout?.on('data', appendOutput);
			proc.stderr?.on('data', appendOutput);
			proc.once('error', error => settle(error));
			proc.once('close', code => {
				this.logger.info('yt-dlp update process exited', { code });
				settle(code === 0 ? undefined : new Error(`Update process exited with code ${code ?? 'unknown'}.`));
			});
		});
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

		const youtubeMatch = session.url.match(this.youtubeURLPattern);
		const args         = [];

		if (session.audioOnly) {
			args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
			if (this.settings.get<boolean>(ESettingsKey.UseThumbnailForCoverArt)) {
				args.push('--embed-thumbnail');
			}
		}

		args.push('-o', downloadPath, '--ffmpeg-location', ffmpegPath.toString());

		const cookies = this.settings.get<Nullable<string>>(ESettingsKey.CookiesFilePath, null);
		if (cookies) {
			args.push('--cookies', cookies);
		}

		if (this.settings.get(ESettingsKey.SkipYoutubePlaylists)) {
			args.push('--no-playlist');
		}

		// Keep the media URL after `--` so it is never parsed as an option.
		args.push('--', session.url);

		if (youtubeMatch) {
			void this.thumbnail.downloadThumbnail(youtubeMatch[1]).catch(error => {
				this.logger.warn('Failed to cache video thumbnail', { error });
			});
		}

		this.logger.info('Spawning yt-dlp', { args });

		this.proc = spawn(ytDlpPath, args);

		const percentPattern = /\b(\d+(?:\.\d+)?)%/;
		const logBuffer: string[] = [];
		let logFlushTimer: ReturnType<typeof setTimeout> | undefined;
		let progressTimer: ReturnType<typeof setTimeout> | undefined;
		let lastProgressEmittedAt = 0;
		let lastEmittedProgress = -1;

		const flushLogs = () => {
			if (logFlushTimer) {
				clearTimeout(logFlushTimer);
				logFlushTimer = undefined;
			}

			if (logBuffer.length > 0) {
				this.window.emitMain('yt-dlp->stdout', { lines: logBuffer.splice(0) });
			}
		};
		const queueLog = (line: string) => {
			const trimmed = line.trim();
			if (trimmed.length === 0) {
				return;
			}

			logBuffer.push(trimmed);
			logFlushTimer ??= setTimeout(flushLogs, 75);
		};
		const emitProgress = () => {
			progressTimer = undefined;
			lastProgressEmittedAt = Date.now();
			lastEmittedProgress = session.progress;
			this.window.emitAll('yt-dlp->download-progress', { id: session.id, progress: session.progress });
			eventBus.emit('ytdlp:download-progress', session);
		};
		const queueProgress = () => {
			if (progressTimer) {
				return;
			}

			const elapsed = Date.now() - lastProgressEmittedAt;
			if (elapsed >= 100) {
				emitProgress();
			} else {
				progressTimer = setTimeout(emitProgress, 100 - elapsed);
			}
		};
		const flushOutput = () => {
			flushLogs();
			if (progressTimer) {
				clearTimeout(progressTimer);
				progressTimer = undefined;
			}
			if (session.progress !== lastEmittedProgress) {
				emitProgress();
			}
		};

		createInterface({ input: this.proc.stdout! }).on('line', line => {
			queueLog(line);

			const match = line.match(percentPattern);
			if (!match) {
				return;
			}

			const percent = Math.min(100, Math.max(0, parseFloat(match[1])));

			session.progress = percent;
			queueProgress();
		});

		createInterface({ input: this.proc.stderr! }).on('line', queueLog);

		this.proc.once('close', code => {
			flushOutput();
			session.success = code === 0;
			session.finishedAt = Date.now();
			this.finishActive(showNotification, youtubeMatch?.[1], downloadDir);
		});

		this.proc.once('error', err => {
			flushOutput();
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

		if (finished.success && showNotification && youtubeID && downloadDir && !this.window.getMainWindow()?.isFocused()) {
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
