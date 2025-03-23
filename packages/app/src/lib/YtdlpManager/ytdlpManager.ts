import kill from 'tree-kill';
import { app, dialog } from 'electron';
import { spawn } from 'node:child_process';
import { join, posix, win32 } from 'node:path';
import { IpcChannel, SettingsKey } from 'shared';
import { NotificationBuilder } from '~/lib/Notifications';
import { getExtraFilePath, getExtraResourcePath } from '~/utils';
import type { Nullable } from 'shared';
import type { ChildProcess } from 'node:child_process';
import type { EventEmitter } from '~/lib/EventEmitter';
import type { WindowManager } from '~/lib/WindowManager';
import type { Notifications } from '~/lib/Notifications';
import type { SettingsManager } from '~/lib/SettingsManager';
import type { ThumbnailDownloader } from './thumbnailDownloader';

export class YtdlpManager {
	private proc: Nullable<ChildProcess> = null;

	private readonly youtubeUrlPattern: RegExp;

	public constructor(
		private readonly eventEmitter: EventEmitter,
		private readonly settingsManager: SettingsManager,
		private readonly windowManager: WindowManager,
		private readonly notifications: Notifications,
		private readonly thumbnailDownloader: ThumbnailDownloader,
	) {
		this.youtubeUrlPattern   = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
	}

	public get isBusy() {
		return this.proc !== null;
	}

	public async download(url: string, audioOnly = false) {
		const ytDlpPath            = this.settingsManager.get<string>(SettingsKey.YtdlpPath);
		const downloadNameTemplate = this.settingsManager.get<string>(SettingsKey.DownloadNameTemplate);
		const downloadDir          = this.settingsManager.get<string>(SettingsKey.DownloadDir);
		const showNotification     = this.settingsManager.get<boolean>(SettingsKey.EnableDownloadCompletionToast);
		const ffmpegPath           = getExtraFilePath('ffmpeg.exe');
		const downloadPath         = join(downloadDir, downloadNameTemplate).replaceAll(win32.sep, posix.sep);

		const emitLog = (data: any) => {
			const line = data.toString().trim() as string;
			if (line.length === 0) {
				return;
			}

			this.windowManager.emitMain(IpcChannel.DownloadOutput, line);
		};

		this.windowManager.emitMain(IpcChannel.DownloadStarted, url);
		this.eventEmitter.emit('download-started', url);

		let notificationImage          = getExtraResourcePath('notifications/logo.png');
		let notificationImagePlacement = 'appLogoOverride';

		const youtubeMatch = url.match(this.youtubeUrlPattern);
		if (youtubeMatch) {
			notificationImagePlacement = 'hero';
			notificationImage          = await this.thumbnailDownloader.downloadThumbnail(youtubeMatch[1]);
		}

		if (audioOnly) {
			this.proc = spawn(ytDlpPath, ['-x', '--audio-format', 'mp3', url, '-o', downloadPath, '--ffmpeg-location', ffmpegPath]);
		} else {
			this.proc = spawn(ytDlpPath, [url, '-o', downloadPath, '--ffmpeg-location', ffmpegPath]);
		}

		this.proc.stdout!.on('data', emitLog);
		this.proc.stderr!.on('data', emitLog);

		this.proc.once('close', code => {
			this.windowManager.emitMain(IpcChannel.DownloadFinished, code);
			this.eventEmitter.emit('download-finished');

			if (showNotification) {
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

	public cancelDownload() {
		if (this.proc) {
			kill(this.proc.pid!, 'SIGINT');
			this.cleanupProcess();
			this.windowManager.emitMain(IpcChannel.DownloadCanceled);
			this.windowManager.emitMain(IpcChannel.DownloadFinished);
			this.eventEmitter.emit('download-finished');
		}
	}

	public async updateBinary() {
		this.windowManager.emitMain(IpcChannel.UpdatingYtdlpBinary);

		const ytDlpPath = this.settingsManager.get<string>(SettingsKey.YtdlpPath);

		return new Promise<void>((res) => {
			const proc = spawn(ytDlpPath, ['-U']);
			proc.once('close', () => {
				this.windowManager.emitMain(IpcChannel.UpdatedYtdlpBinary);
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
