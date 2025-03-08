import kill from 'tree-kill';
import { dialog } from 'electron';
import { spawn } from 'node:child_process';
import { join, posix, win32 } from 'node:path';
import { IpcChannel, SettingsKey } from 'shared';
import { parseCalVer, getExtraFilePath } from '~/utils';
import type { Ipc } from '~/lib/Ipc';
import type { Nullable } from 'shared';
import type { Github } from '~/lib/Github';
import type { ChildProcess } from 'node:child_process';
import type { EventEmitter } from '~/lib/EventEmitter';
import type { WindowManager } from '~/lib/WindowManager';
import type { SettingsManager } from '~/lib/SettingsManager';

export class YtdlpManager {
	private proc: Nullable<ChildProcess> = null;

	public constructor(
		private readonly ipc: Ipc,
		private readonly github: Github,
		private readonly eventEmitter: EventEmitter,
		private readonly settingsManager: SettingsManager,
		private readonly windowManager: WindowManager
	) {}

	public async download(url: string, audioOnly = false) {
		const ytDlpPath    = this.settingsManager.get<string>(SettingsKey.YtdlpPath);
		const ffmpegPath   = getExtraFilePath('ffmpeg.exe');
		const downloadPath = join(this.settingsManager.get(SettingsKey.DownloadDir), '%(title)s [%(id)s].%(ext)s').replaceAll(win32.sep, posix.sep);
		const emitLog = (data: any) => {
			const line = data.toString().trim() as string;
			if (line.length === 0) {
				return;
			}

			this.windowManager.emitMain(IpcChannel.DownloadOutput, line);
		};

		this.windowManager.emitMain(IpcChannel.DownloadStarted, url);
		this.eventEmitter.emit('download-started', url);

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

			if (this.settingsManager.get(SettingsKey.NotificationSoundId, 1) > 0) {
				this.windowManager.emitMain(IpcChannel.PlayNotificationSound);
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

	public async hasUpdate() {
		const release = await this.github.getLatestRepositoryRelease('yt-dlp', 'yt-dlp');
		if (!release) {
			return false;
		}

		const ytDlpPath        = this.settingsManager.get<string>(SettingsKey.YtdlpPath);
		const latestVersion    = release.tag_name;
		const installedVersion = await new Promise<string>((res) => {
			const proc = spawn(ytDlpPath, ['--version']);

			let output = '';

			// TODO make this more robust

			proc.stdout.on('data', data => output += data.toString().trim());
			proc.once('close', () => res(output));
		});

		return this.isNewerCalVer(latestVersion, installedVersion);
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

	private isNewerCalVer(version1: string, version2: string): boolean {
		const [year1, month1, day1] = parseCalVer(version1);
		const [year2, month2, day2] = parseCalVer(version2);

		if (year1 !== year2) {
			return year1 > year2;
		}

		if (month1 !== month2) {
			return month1 > month2;
		}

		return day1 > day2;
	}
}
