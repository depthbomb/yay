import { app } from 'electron';
import { randomUUID } from 'node:crypto';
import { USER_AGENT } from '~/constants';
import { spawn } from 'node:child_process';
import { HTTPService } from '~/services/http';
import { GithubService } from '~/services/github';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import { OperationCancelledError } from '@depthbomb/node-common';
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
		this.throwIfCancelled(signal);

		const url = await this.resolveYtdlpDownloadURL();
		if (!url) {
			throw new Error('Could not resolve yt-dlp release download URL');
		}

		const res = await this.httpClient.get(url, { signal });
		if (!res.ok) {
			throw new Error(`Could not download yt-dlp binary (${res.status} ${res.statusText})`);
		}

		const tempPath = new Path(app.getPath('temp'), '_yt-dlp.exe');

		try {
			await this.httpClient.downloadWithProgress(res, tempPath, { signal, onProgress });
			this.throwIfCancelled(signal);

			await tempPath.rename(path);

			if (!await path.exists()) {
				throw new Error('Downloaded yt-dlp binary could not be moved to its destination');
			}
		} catch (err) {
			this.rethrowIfCancelled(signal, err);
			throw err;
		} finally {
			await tempPath.unlink().catch(() => {});
		}
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
		this.throwIfCancelled(signal);

		const res = await this.httpClient.get(url, { signal });
		if (!res.ok) {
			throw new Error(`Could not download archive (${res.status} ${res.statusText})`);
		}

		const tempPath = new Path(app.getPath('temp'), `_${randomUUID()}.zip`);
		const sevenZipPath = getExtraFilePath('7za.exe');

		try {
			await this.httpClient.downloadWithProgress(res, tempPath, { signal, onProgress });
			this.throwIfCancelled(signal);

			onExtracting?.();

			await this.extractArchive(sevenZipPath, tempPath, filesToExtract, extractPath, signal);
			this.throwIfCancelled(signal);

			for (const file of filesToExtract) {
				const extractedPath = new Path(extractPath, file);
				if (!await extractedPath.exists()) {
					throw new Error(`Archive extraction finished but expected file is missing: ${file}`);
				}
			}
		} catch (err) {
			this.rethrowIfCancelled(signal, err);
			throw err;
		} finally {
			onCleaningUp?.();
			await tempPath.unlink().catch(() => {});
		}
	}

	private async extractArchive(sevenZipPath: Path, archivePath: Path, filesToExtract: string[], extractPath: string, signal: AbortSignal) {
		this.throwIfCancelled(signal);

		const { promise, resolve, reject } = Promise.withResolvers<void>();

		const extraction = spawn(sevenZipPath.toString(), [
			'e',
			archivePath.toString(),
			'-r',
			`-o${extractPath}`,
			'-aoa',
			...filesToExtract,
		]);

		const onAbort = () => {
			this.logger.info('Cancelling archive extraction');
			extraction.kill();
		};

		signal.addEventListener('abort', onAbort, { once: true });

		extraction.once('error', err => {
			signal.removeEventListener('abort', onAbort);
			this.logger.error('Error while extracting archive', { err });
			reject(err);
		});

		extraction.once('close', code => {
			signal.removeEventListener('abort', onAbort);

			if (signal.aborted) {
				reject(new OperationCancelledError());
				return;
			}

			if (code !== 0) {
				reject(new Error(`Archive extraction failed with exit code ${code}`));
				return;
			}

			resolve();
		});

		return promise;
	}

	private throwIfCancelled(signal: AbortSignal): void | never {
		if (signal.aborted) {
			throw new OperationCancelledError();
		}
	}

	private rethrowIfCancelled(signal: AbortSignal, err: unknown): void | never {
		const maybeError = err as { name?: string; code?: string; };
		if (signal.aborted || maybeError?.name === 'AbortError' || maybeError?.code === 'ABORT_ERR') {
			throw new OperationCancelledError();
		}
	}
}
