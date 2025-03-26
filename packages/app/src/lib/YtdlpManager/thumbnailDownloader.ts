import { app } from 'electron';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { USER_AGENT } from '~/constants';
import { mkdir } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { finished } from 'node:stream/promises';
import { dirExists, fileExists } from '~/utils';
import type { HttpClient, HttpClientManager } from '~/lib/HttpClientManager';

export class ThumbnailDownloader {
	private readonly http: HttpClient;
	private readonly cacheDir: string;

	public constructor(private readonly httpClientManager: HttpClientManager) {
		this.http     = this.httpClientManager.getClient('ThumbnailDownloader', { userAgent: USER_AGENT });
		this.cacheDir = join(app.getPath('userData'), 'thumbnail_cache');
	}

	public async downloadThumbnail(videoId: string): Promise<string> {
		const thumbnailPath   = join(this.cacheDir, `${videoId}.jpg`);
		const thumbnailExists = await fileExists(thumbnailPath);
		if (thumbnailExists) {
			return thumbnailPath;
		}

		const cacheDirExists = await dirExists(this.cacheDir);
		if (!cacheDirExists) {
			await mkdir(this.cacheDir, { recursive: true });
		}

		const res = await this.http.get(`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`);
		const fs  = createWriteStream(thumbnailPath);
		await finished(Readable.fromWeb(res.body!).pipe(fs));

		return thumbnailPath;
	}
}
