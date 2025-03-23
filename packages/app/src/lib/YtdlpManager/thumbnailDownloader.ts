import { app } from 'electron';
import { join } from 'node:path';
import { fileExists } from '~/utils';
import { Readable } from 'node:stream';
import { USER_AGENT } from '~/constants';
import { createWriteStream } from 'node:fs';
import { finished } from 'node:stream/promises';
import type { HttpClient, HttpClientManager } from '~/lib/HttpClientManager';

export class ThumbnailDownloader {
	private readonly http: HttpClient;

	public constructor(private readonly httpClientManager: HttpClientManager) {
		this.http = this.httpClientManager.getClient('ThumbnailDownloader', { userAgent: USER_AGENT });
	}

	public async downloadThumbnail(videoId: string): Promise<string> {
		const path   = join(app.getPath('temp'), `${videoId}.jpg`);
		const exists = await fileExists(path);
		if (exists) {
			return path;
		}

		const res = await this.http.get(`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`);
		const fs  = createWriteStream(path);
		await finished(Readable.fromWeb(res.body!).pipe(fs));

		return path;
	}
}
