import kill from 'tree-kill';
import { dialog } from 'electron';
import { spawn } from 'node:child_process';
import { IpcService } from '~/services/ipc';
import { join, posix, win32 } from 'node:path';
import { IpcChannel, SettingsKey } from 'shared';
import { EventsService } from '~/services/events';
import { WindowService } from '~/services/window';
import { inject, injectable } from '@needle-di/core';
import { SettingsService } from '~/services/settings';
import { LifecycleService } from '~/services/lifecycle';
import { ThumbnailDownloader } from './thumbnailDownloader';
import { getExtraFilePath, getExtraResourcePath } from '~/utils';
import { NotificationBuilder, NotificationsService } from '~/services/notifications';
import type { Nullable } from 'shared';
import type { ChildProcess } from 'node:child_process';
import type { IBootstrappable } from '~/common/IBootstrappable';

@injectable()
export class YtdlpService implements IBootstrappable {
	private proc: Nullable<ChildProcess> = null;

	private readonly youtubeUrlPattern: RegExp;

	public constructor(
		private readonly lifecycle           = inject(LifecycleService),
		private readonly ipc                 = inject(IpcService),
		private readonly events              = inject(EventsService),
		private readonly settings            = inject(SettingsService),
		private readonly window              = inject(WindowService),
		private readonly notifications       = inject(NotificationsService),
		private readonly thumbnailDownloader = inject(ThumbnailDownloader),
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

		const emitLog = (data: any) => {
			const line = data.toString().trim() as string;
			if (line.length === 0) {
				return;
			}

			this.window.emitMain(IpcChannel.Ytdlp_Stdout, line);
		};

		this.window.emitAll(IpcChannel.Ytdlp_DownloadStarted, url);
		this.events.emit('download-started', url);

		let notificationImage          = getExtraResourcePath('notifications/logo.png');
		let notificationImagePlacement = 'appLogoOverride';

		const youtubeMatch = url.match(this.youtubeUrlPattern);
		if (youtubeMatch) {
			const videoId = youtubeMatch[1];
			if (this.settings.get(SettingsKey.SkipYoutubePlaylists)) {
				url = `https://www.youtube.com/watch?v=${videoId}`;
			}

			notificationImagePlacement = 'hero';
			notificationImage          = await this.thumbnailDownloader.downloadThumbnail(videoId);
		}

		if (audioOnly) {
			this.proc = spawn(ytDlpPath, ['-x', '--audio-format', 'mp3', url, '-o', downloadPath, '--ffmpeg-location', ffmpegPath]);
		} else {
			this.proc = spawn(ytDlpPath, [url, '-o', downloadPath, '--ffmpeg-location', ffmpegPath]);
		}

		this.proc.stdout!.on('data', emitLog);
		this.proc.stderr!.on('data', emitLog);

		this.proc.once('close', code => {
			this.window.emitAll(IpcChannel.Ytdlp_DownloadFinished, code);
			this.events.emit('download-finished');

			if (showNotification && !this.window.getMainWindow()?.isFocused()) {
				this.showCompletionNotification(downloadDir, notificationImage, notificationImagePlacement);
			}

			this.cleanupProcess();
		});
		this.proc.once('error', async error => {
			this.cleanupProcess();
			await dialog.showMessageBox({
				type: 'error',
				title: 'Error',
				message: error.message,
				detail: error.stack
			});
		});
	}

	public cancelDownload(shutdown: boolean) {
		if (this.proc) {
			kill(this.proc.pid!, 'SIGINT');
			this.cleanupProcess();

			if (!shutdown) {
				this.window.emitAll(IpcChannel.Ytdlp_DownloadCanceled);
				this.window.emitAll(IpcChannel.Ytdlp_DownloadFinished);
				this.events.emit('download-finished');
			}
		}
	}

	public async updateBinary() {
		this.window.emitAll(IpcChannel.Ytdlp_UpdatingBinary);

		const ytDlpPath = this.settings.get<string>(SettingsKey.YtdlpPath);

		return new Promise<void>((res) => {
			const proc = spawn(ytDlpPath, ['-U']);
			proc.once('close', () => {
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
