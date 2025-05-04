import { app } from 'electron';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { USER_AGENT } from '~/constants';
import { mkdir } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { HttpService } from '~/services/http';
import { dirExists, fileExists } from '~/utils';
import { finished } from 'node:stream/promises';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import type { HttpClient } from '~/services/http';

@injectable()
export class ThumbnailDownloader {
	private readonly httpClient: HttpClient;
	private readonly cacheDir: string;

	public constructor(
		private readonly logger = inject(LoggingService),
		private readonly http   = inject(HttpService),
	) {
		this.httpClient = this.http.getClient('ThumbnailDownloader', { userAgent: USER_AGENT });
		this.cacheDir   = join(app.getPath('userData'), 'thumbnail_cache');
	}

	public async downloadThumbnail(videoId: string): Promise<string> {
		const thumbnailPath   = join(this.cacheDir, `${videoId}.jpg`);
		const thumbnailExists = await fileExists(thumbnailPath);
		if (thumbnailExists) {
			this.logger.info('Found existing thumbnail', { thumbnailPath });
			return thumbnailPath;
		}

		const cacheDirExists = await dirExists(this.cacheDir);
		if (!cacheDirExists) {
			this.logger.info('Created thumbnail cache directory', { dir: this.cacheDir });
			await mkdir(this.cacheDir, { recursive: true });
		}

		const url = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
		const res = await this.httpClient.get(url);
		const fs  = createWriteStream(thumbnailPath);
		await finished(Readable.fromWeb(res.body!).pipe(fs));

		this.logger.info('Wrote thumbnail to disk', { url, thumbnailPath });

		return thumbnailPath;
	}
}
