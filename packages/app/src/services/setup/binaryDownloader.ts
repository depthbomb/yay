import { app } from 'electron';
import { USER_AGENT } from '~/constants';
import { unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import { getExtraFilePath } from '~/utils';
import { HttpService } from '~/services/http';
import { GithubService } from '~/services/github';
import { inject, injectable } from '@needle-di/core';
import type { HttpClient } from '~/services/http';

@injectable()
export class BinaryDownloader {
	private readonly httpClient: HttpClient;

	public constructor(
		private readonly http   = inject(HttpService),
		private readonly github = inject(GithubService),
	) {
		this.httpClient = this.http.getClient('BinaryDownloader', { userAgent: USER_AGENT });
	}

	public async downloadYtdlpBinary(path: string, signal: AbortSignal, onProgress?: (progress: number) => void) {
		const url = await this.resolveYtdlpDownloadUrl();
		if (!url) {
			return;
		}

		const res = await this.httpClient.get(url, { signal });
		await this.httpClient.downloadWithProgress(res, path, { signal, onProgress });
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

		const res = await this.httpClient.get(url, { signal });
		if (!res.ok) {
			return;
		}

		const tempPath = join(app.getPath('temp'), '_ffmpeg.zip');

		await this.httpClient.downloadWithProgress(res, tempPath, { signal, onProgress });

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
