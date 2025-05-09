import mitt from 'mitt';
import kill from 'tree-kill';
import { dialog } from 'electron';
import { unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { IpcService } from '~/services/ipc';
import { join, posix, win32 } from 'node:path';
import { IpcChannel, SettingsKey } from 'shared';
import { WindowService } from '~/services/window';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import { SettingsService } from '~/services/settings';
import { LifecycleService } from '~/services/lifecycle';
import { ThumbnailService } from '~/services/thumbnail';
import { getExtraFilePath, getFilePathFromAsar } from '~/utils';
import { NotificationBuilder, NotificationsService } from '~/services/notifications';
import type { Nullable } from 'shared';
import type { ChildProcess } from 'node:child_process';
import type { IBootstrappable } from '~/common/IBootstrappable';

@injectable()
export class YtdlpService implements IBootstrappable {
	public readonly events = mitt<{ downloadStarted: string; downloadProgress: number; downloadFinished: void; }>();

	private proc: Nullable<ChildProcess> = null;

	private readonly youtubeUrlPattern: RegExp;

	public constructor(
		private readonly logger        = inject(LoggingService),
		private readonly lifecycle     = inject(LifecycleService),
		private readonly ipc           = inject(IpcService),
		private readonly settings      = inject(SettingsService),
		private readonly window        = inject(WindowService),
		private readonly notifications = inject(NotificationsService),
		private readonly thumbnail     = inject(ThumbnailService),
	) {
		this.youtubeUrlPattern   = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
	}

	public get isBusy() {
		return this.proc !== null;
	}

	public async bootstrap() {
		this.ipc.registerHandler(IpcChannel.Ytdlp_DownloadVideo,   async (_, url: string) => await this.download(url));
		this.ipc.registerHandler(IpcChannel.Ytdlp_DownloadAudio,   async (_, url: string) => await this.download(url, true));
		this.ipc.registerHandler(IpcChannel.Ytdlp_DownloadDefault, async (_, url: string) => {
			const defaultAction = this.settings.get(SettingsKey.DefaultDownloadAction);
			await this.download(url, defaultAction === 'audio');
		});
		this.ipc.registerHandler(IpcChannel.Ytdlp_RemoveCookiesFile, async () => {
			const cookiesFilePath = this.settings.get<Nullable<string>>(SettingsKey.CookiesFilePath, null);

			await this.settings.set(SettingsKey.CookiesFilePath, null);

			if (cookiesFilePath) {
				await unlink(cookiesFilePath);
			}
		});
		this.ipc.registerHandler(IpcChannel.Ytdlp_CancelDownload, () => this.cancelDownload(false));
		this.ipc.registerHandler(IpcChannel.Ytdlp_UpdateBinary,   async () => await this.updateBinary());

		this.lifecycle.events.on('shutdown', () => this.cancelDownload(true));
	}

	public async download(url: string, audioOnly = false) {
		const ytDlpPath            = this.settings.get<string>(SettingsKey.YtdlpPath);
		const downloadNameTemplate = this.settings.get<string>(SettingsKey.DownloadNameTemplate);
		const downloadDir          = this.settings.get<string>(SettingsKey.DownloadDir);
		const showNotification     = this.settings.get<boolean>(SettingsKey.EnableDownloadCompletionToast);
		const ffmpegPath           = getExtraFilePath('ffmpeg.exe');
		const downloadPath         = join(downloadDir, downloadNameTemplate).replaceAll(win32.sep, posix.sep);

		const emitLog = (line: string) => {
			if (line.length === 0) {
				return;
			}

			this.window.emitMain(IpcChannel.Ytdlp_Stdout, line);
		};

		this.window.emitAll(IpcChannel.Ytdlp_DownloadStarted, url);
		this.events.emit('downloadStarted', url);
		this.logger.info('Starting media download', { url, audioOnly });

		let notificationImage          = getFilePathFromAsar('notifications/logo.png');
		let notificationImagePlacement = 'appLogoOverride';

		const youtubeMatch = url.match(this.youtubeUrlPattern);
		const ytdlpArgs    = [] as string[];

		if (audioOnly) {
			ytdlpArgs.push('-x', '--audio-format', 'mp3', url, '-o', downloadPath, '--ffmpeg-location', ffmpegPath);
		} else {
			ytdlpArgs.push(url, '-o', downloadPath, '--ffmpeg-location', ffmpegPath);
		}

		const cookiesFilePath = this.settings.get<Nullable<string>>(SettingsKey.CookiesFilePath, null);
		if (cookiesFilePath) {
			ytdlpArgs.push('--cookies', cookiesFilePath!);
		}

		if (this.settings.get(SettingsKey.SkipYoutubePlaylists)) {
			ytdlpArgs.push('--no-playlist')
		}

		if (youtubeMatch) {
			this.thumbnail.downloadThumbnail(youtubeMatch[1]);
		}

		const mainWindow     = this.window.getMainWindow()!;
		const percentPattern = /\b(\d+(?:\.\d+)?)%/;

		this.logger.debug('Spawning yt-dlp process', { args: ytdlpArgs });

		this.proc = spawn(ytDlpPath, ytdlpArgs);
		this.proc.stdout!.on('data', data => {
			const line = data.toString().trim() as string;
			emitLog(line);

			const percentMatch = line.match(percentPattern);
			if (percentMatch) {
				this.events.emit('downloadProgress', parseInt(percentMatch[1]) / 100);
			}
		});
		this.proc.stderr!.on('data', data => {
			const line = data.toString().trim() as string;
			emitLog(line);
		});
		this.proc.once('close', async code => {
			this.logger.info('yt-dlp process exited', { code });
			this.window.emitAll(IpcChannel.Ytdlp_DownloadFinished, code);
			this.events.emit('downloadFinished');

			if (youtubeMatch) {
				notificationImagePlacement = 'hero';
				notificationImage          = await this.thumbnail.getThumbnail(youtubeMatch[1]) ?? '';
			}

			if (showNotification && !this.window.getMainWindow()?.isFocused()) {
				this.showCompletionNotification(downloadDir, notificationImage, notificationImagePlacement);
			}

			this.cleanupProcess();
		});
		this.proc.once('error', async err => {
			this.logger.error('yt-dlp process error', { err });
			this.cleanupProcess();
			await dialog.showMessageBox({
				type: 'error',
				title: 'Error',
				message: err.message,
				detail: err.stack
			});
		});
	}

	public cancelDownload(shutdown: boolean) {
		if (this.proc) {
			this.logger.info('Killing yt-dlp process', { shutdown });
			kill(this.proc.pid!, 'SIGINT');
			this.cleanupProcess();

			if (!shutdown) {
				this.window.emitAll(IpcChannel.Ytdlp_DownloadCanceled);
				this.window.emitAll(IpcChannel.Ytdlp_DownloadFinished);
				this.events.emit('downloadFinished');
			}
		}
	}

	public async updateBinary() {
		this.logger.info('Attempting to update yt-dlp binary');
		this.window.emitAll(IpcChannel.Ytdlp_UpdatingBinary);

		const ytDlpPath = this.settings.get<string>(SettingsKey.YtdlpPath);

		return new Promise<void>((res) => {
			const proc = spawn(ytDlpPath, ['-U']);

			proc.stdout!.on('data', data => this.logger.silly(`yt-dlp -U: ${data}`));
			proc.once('close', code => {
				this.logger.info('yt-dlp update process exited', { code });
				this.window.emitAll(IpcChannel.Ytdlp_UpdatedBinary);
				res();
			});
		});
	}

	private cleanupProcess() {
		if (this.proc) {
			this.proc.stdout?.removeAllListeners('data');
			this.proc.removeAllListeners('close');
			this.proc.removeAllListeners('error');
			this.proc = null;
		}
	}

	private showCompletionNotification(downloadDir: string, image: string, imagePlacement = 'appLogoOverride') {
		this.notifications.showNotification(
			new NotificationBuilder()
				.setTitle('Yet Another YouTube Downloader')
				.addText('Operation Finished!')
				.setImage(image, imagePlacement)
				.setAudio('ms-winsoundevent:Notification.IM')
				.addAction('Open Folder', `file:///${downloadDir}`, 'protocol')
		);
	}
}
