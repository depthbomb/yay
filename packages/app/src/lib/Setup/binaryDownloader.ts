import { app } from 'electron';
import { USER_AGENT } from '~/constants';
import { unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import { getExtraFilePath } from '~/utils';
import type { Github } from '~/lib/Github';
import type { HttpClient, HttpClientManager } from '~/lib/HttpClientManager';

export class BinaryDownloader {
	private readonly http: HttpClient;

	public constructor(
		private readonly github: Github,
		private readonly httpClientManager: HttpClientManager
	) {
		this.http = this.httpClientManager.getClient('BinaryDownloader', { userAgent: USER_AGENT });
	}

	public async downloadYtdlpBinary(path: string, signal: AbortSignal, onProgress?: (progress: number) => void) {
		const url = await this.resolveYtdlpDownloadUrl();
		if (!url) {
			return;
		}

		const res = await this.http.get(url, { signal });
		await this.http.downloadWithProgress(res, path, { signal, onProgress });
	}

	public async downloadFfmpegBinary(
		path: string,
		signal: AbortSignal,
		onProgress?: (progress: number) => void,
		onExtracting?: () => void,
		onCleaningUp?: () => void,
	) {
		const url = await this.resolveFfmpegDownloadUrl();
		if (!url) {
			return;
		}

		const res = await this.http.get(url, { signal });
		if (!res.ok) {
			return;
		}

		const tempPath = join(app.getPath('temp'), '_ffmpeg.zip');

		await this.http.downloadWithProgress(res, tempPath, { signal, onProgress });

		const sevenZipPath = getExtraFilePath('7za.exe');

		return new Promise<void>((res, rej) => {
			if (signal.aborted) {
				return res();
			}

			onExtracting?.();
			const extraction = spawn(sevenZipPath, [
				'e',
				tempPath,
				'-r',
				`-o${dirname(path)}`,
				'-aoa',
				'ffmpeg.exe',
				'ffprobe.exe',
			]);

			extraction.once('error', err => console.error(err));
			extraction.once('close', async code => {
				onCleaningUp?.();
				await unlink(tempPath);
				if (code === 0) {
					res();
				} else {
					rej(new Error('Failed to extract FFmpeg binary'))
				}
			});
		});
	}

	private async resolveYtdlpDownloadUrl() {
		const release = await this.github.getLatestRepositoryRelease('yt-dlp', 'yt-dlp');
		if (!release) {
			return;
		}

		const asset = release.assets.find(a => a.name === 'yt-dlp.exe');

		return asset?.browser_download_url;
	}

	private async resolveFfmpegDownloadUrl() {
		const release = await this.github.getLatestRepositoryRelease('yt-dlp', 'FFmpeg-Builds');
		if (!release) {
			return;
		}

		const asset = release.assets.find(a => a.name === 'ffmpeg-master-latest-win64-gpl.zip');

		return asset?.browser_download_url;
	}
}
