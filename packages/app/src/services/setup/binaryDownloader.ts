import { app } from 'electron';
import { randomUUID } from 'node:crypto';
import { USER_AGENT } from '~/constants';
import { spawn } from 'node:child_process';
import { HTTPService } from '~/services/http';
import { GithubService } from '~/services/github';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import { Path } from '@depthbomb/node-common/pathlib';
import { getExtraFileDir, getExtraFilePath } from '~/common';
import type { HTTPClient } from '~/services/http';

@injectable()
export class BinaryDownloader {
	private readonly httpClient: HTTPClient;

	public constructor(
		private readonly logger = inject(LoggingService),
		private readonly http   = inject(HTTPService),
		private readonly github = inject(GithubService),
	) {
		this.httpClient = this.http.getClient('BinaryDownloader', { userAgent: USER_AGENT });
	}

	public async downloadYtdlpBinary(path: Path, signal: AbortSignal, onProgress?: (progress: number) => void) {
		const url = await this.resolveYtdlpDownloadURL();
		if (!url) {
			return;
		}

		const res = await this.httpClient.get(url, { signal });
		if (!res.ok) {
			return;
		}

		const tempPath = new Path(app.getPath('temp'), '_yt-dlp.exe');

		await this.httpClient.downloadWithProgress(res, tempPath, { signal, onProgress });
		await tempPath.rename(path);
	}

	public async downloadDenoBinary(
		signal: AbortSignal,
		onProgress?: (progress: number) => void,
		onExtracting?: () => void,
		onCleaningUp?: () => void,
	) {
		const url = await this.resolveDenoDownloadURL();
		if (!url) {
			throw new Error('Could not resolve Deno release download URL');
		}

		await this.downloadAndExtract(
			url,
			['deno.exe'],
			getExtraFileDir().toString(),
			signal,
			onProgress,
			onExtracting,
			onCleaningUp
		);
	}

	public async downloadFfmpegBinary(
		signal: AbortSignal,
		onProgress?: (progress: number) => void,
		onExtracting?: () => void,
		onCleaningUp?: () => void,
	) {
		const url = await this.resolveFfmpegDownloadURL();
		if (!url) {
			throw new Error('Could not resolve FFmpeg release download URL');
		}

		await this.downloadAndExtract(
			url,
			['ffmpeg.exe', 'ffprobe.exe'],
			getExtraFileDir().toString(),
			signal,
			onProgress,
			onExtracting,
			onCleaningUp
		);
	}

	private async resolveYtdlpDownloadURL() {
		const release = await this.github.getLatestRepositoryRelease('yt-dlp', 'yt-dlp');
		if (!release) {
			return;
		}

		const asset = release.assets.find(a => a.name === 'yt-dlp.exe');

		return asset?.browser_download_url;
	}

	private async resolveDenoDownloadURL() {
		const release = await this.github.getLatestRepositoryRelease('denoland', 'deno');
		if (!release) {
			return;
		}

		const asset = release.assets.find(a => a.name.endsWith('deno-x86_64-pc-windows-msvc.zip'));

		return asset?.browser_download_url;
	}

	private async resolveFfmpegDownloadURL() {
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

	private async downloadAndExtract(
		url: string,
		filesToExtract: string[],
		extractPath: string,
		signal: AbortSignal,
		onProgress?: (progress: number) => void,
		onExtracting?: () => void,
		onCleaningUp?: () => void
	) {
		const res = await this.httpClient.get(url, { signal });
		if (!res.ok) {
			return;
		}

		const tempPath = new Path(app.getPath('temp'), `_${randomUUID()}.zip`);

		await this.httpClient.downloadWithProgress(res, tempPath, { signal, onProgress });

		const sevenZipPath = getExtraFilePath('7za.exe');

		const { promise, resolve, reject } = Promise.withResolvers<void>();

		if (signal.aborted) {
			resolve();
			return promise;
		}

		onExtracting?.();

		const extraction = spawn(sevenZipPath.toString(), [
			'e',
			tempPath.toString(),
			'-r',
			`-o${extractPath}`,
			'-aoa',
			...filesToExtract,
		]);

		extraction.once('error', err => {
			this.logger.error('Error while extracting archive', { err });
			reject(err);
		});

		extraction.once('close', async () => {
			try {
				onCleaningUp?.();

				await tempPath.unlink();

				resolve();
			} catch (err) {
				reject(err);
			}
		});

		return promise;
	}
}
