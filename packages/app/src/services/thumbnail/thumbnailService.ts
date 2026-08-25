import { app } from 'electron';
import { ok } from 'shared/ipc';
import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { USER_AGENT } from '~/constants';
import { IPCService } from '~/services/ipc';
import { HTTPService } from '~/services/http';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { readdir, rename, rm, stat, unlink } from 'node:fs/promises';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import { Path } from '@depthbomb/node-common/pathlib';
import type { IBootstrappable } from '~/common';
import type { HTTPClient } from '~/services/http';

@injectable()
export class ThumbnailService implements IBootstrappable {
	private readonly httpClient: HTTPClient;
	private readonly cacheDir: Path;
	private readonly maxCacheEntries = 200;
	private readonly maxCacheAgeMs   = 30 * 24 * 60 * 60 * 1_000;

	public constructor(
		private readonly ipc    = inject(IPCService),
		private readonly logger = inject(LoggingService),
		private readonly http   = inject(HTTPService),
	) {
		this.httpClient = this.http.getClient('ThumbnailService', { userAgent: USER_AGENT });
		this.cacheDir   = new Path(app.getPath('userData'), 'thumbnail_cache');
	}

	public async bootstrap() {
		this.ipc.registerHandler('thumbnail<-clear-cache', () => this.clearCache());
		void this.pruneCache().catch(error => this.logger.warn('Failed to prune thumbnail cache', { error }));
	}

	public async downloadThumbnail(videoID: string) {
		if (!/^[\w-]{11}$/.test(videoID)) {
			throw new Error('Invalid YouTube video ID.');
		}

		const thumbnailPath   = new Path(this.cacheDir, `${videoID}.jpg`);
		const thumbnailExists = await thumbnailPath.isFile();
		if (thumbnailExists) {
			this.logger.debug('Found existing thumbnail', { thumbnailPath });
			return;
		}

		const cacheDirExists = await this.cacheDir.isDir();
		if (!cacheDirExists) {
			this.logger.debug('Created thumbnail cache directory', { dir: this.cacheDir });
			await this.cacheDir.mkdir({ recursive: true });
		}

		const url = `https://i.ytimg.com/vi/${videoID}/maxresdefault.jpg`;
		const res = await this.httpClient.get(url);
		if (!res.ok || !res.body || !res.headers.get('content-type')?.toLowerCase().startsWith('image/')) {
			throw new Error(`Thumbnail request failed with HTTP ${res.status}.`);
		}

		const tempPath = `${thumbnailPath.toString()}.${process.pid}.${randomUUID()}.tmp`;
		try {
			await pipeline(Readable.fromWeb(res.body), createWriteStream(tempPath));
			await rename(tempPath, thumbnailPath.toString());
		} finally {
			await unlink(tempPath).catch(() => {});
		}

		this.logger.info('Wrote thumbnail to disk', { url, thumbnailPath });
		await this.pruneCache();
	}

	public async getThumbnail(videoID: string) {
		const thumbnailPath   = new Path(this.cacheDir, `${videoID}.jpg`);
		const thumbnailExists = await thumbnailPath.isFile();
		if (!thumbnailExists) {
			this.logger.warn('No thumbnail found?', { thumbnailPath });
			return null;
		}

		return thumbnailPath;
	}

	private async clearCache() {
		await rm(this.cacheDir.toString(), { recursive: true, force: true });

		return ok();
	}

	private async pruneCache() {
		if (!await this.cacheDir.isDir()) {
			return;
		}

		const now = Date.now();
		const entries = await readdir(this.cacheDir.toString(), { withFileTypes: true });
		const files = await Promise.all(entries
			.filter(entry => entry.isFile() && entry.name.endsWith('.jpg'))
			.map(async entry => {
				const path = new Path(this.cacheDir, entry.name);
				const info = await stat(path.toString());
				return { path, modifiedAt: info.mtimeMs };
			}));

		files.sort((a, b) => b.modifiedAt - a.modifiedAt);
		const expiredOrExcess = files.filter((file, index) =>
			now - file.modifiedAt > this.maxCacheAgeMs || index >= this.maxCacheEntries
		);

		await Promise.all(expiredOrExcess.map(file => unlink(file.path.toString()).catch(() => {})));
	}
}
