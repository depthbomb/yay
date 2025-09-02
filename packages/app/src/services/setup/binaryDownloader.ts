import { app } from 'electron';
import { USER_AGENT } from '~/constants';
import { join, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import { getExtraFilePath } from '~/utils';
import { HttpService } from '~/services/http';
import { GithubService } from '~/services/github';
import { unlink, rename } from 'node:fs/promises';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import type { HttpClient } from '~/services/http';

@injectable()
export class BinaryDownloader {
	private readonly httpClient: HttpClient;

	public constructor(
		private readonly logger = inject(LoggingService),
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
		if (!res.ok) {
			return;
		}

		const tempPath = join(app.getPath('temp'), '_yt-dlp.exe');

		await this.httpClient.downloadWithProgress(res, tempPath, { signal, onProgress });

		await rename(tempPath, path);
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
			throw new Error('Could not resolve FFmpeg release download URL');
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

			extraction.once('error', err => this.logger.error('Error while extracting archive', { err }));
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
			this.logger.error('Could not retrieve latest release for yt-dlp/FFmpeg-Builds');
			return;
		}

		const asset = release.assets.find(a => a.name.includes('win64-gpl.zip'));
		if (!asset) {
			this.logger.error('Could not find appropriate asset from yt-dlp/FFmpeg-Builds release');
			return;
		}

		return asset.browser_download_url;
	}
}
