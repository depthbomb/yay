import { app } from 'electron';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { USER_AGENT } from '~/constants';
import { mkdir } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { HttpService } from '~/services/http';
import { finished } from 'node:stream/promises';
import { dirExists, fileExists } from '~/common';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import type { HttpClient } from '~/services/http';

@injectable()
export class ThumbnailService {
	private readonly httpClient: HttpClient;
	private readonly cacheDir: string;

	public constructor(
		private readonly logger = inject(LoggingService),
		private readonly http   = inject(HttpService),
	) {
		this.httpClient = this.http.getClient('ThumbnailService', { userAgent: USER_AGENT });
		this.cacheDir   = join(app.getPath('userData'), 'thumbnail_cache');
	}

	public async downloadThumbnail(videoId: string) {
		const thumbnailPath   = join(this.cacheDir, `${videoId}.jpg`);
		const thumbnailExists = await fileExists(thumbnailPath);
		if (thumbnailExists) {
			this.logger.debug('Found existing thumbnail', { thumbnailPath });
			return;
		}

		const cacheDirExists = await dirExists(this.cacheDir);
		if (!cacheDirExists) {
			this.logger.debug('Created thumbnail cache directory', { dir: this.cacheDir });
			await mkdir(this.cacheDir, { recursive: true });
		}

		const url = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
		const res = await this.httpClient.get(url);
		const fs  = createWriteStream(thumbnailPath);
		await finished(Readable.fromWeb(res.body!).pipe(fs));

		this.logger.info('Wrote thumbnail to disk', { url, thumbnailPath });
	}

	public async getThumbnail(videoId: string) {
		const thumbnailPath   = join(this.cacheDir, `${videoId}.jpg`);
		const thumbnailExists = await fileExists(thumbnailPath);
		if (!thumbnailExists) {
			this.logger.warn('No thumbnail found?', { thumbnailPath });
			return null;
		}

		return thumbnailPath;
	}
}
