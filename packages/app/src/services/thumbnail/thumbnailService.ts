import { join } from 'node:path';
import { Readable } from 'node:stream';
import { app, dialog } from 'electron';
import { USER_AGENT } from '~/constants';
import { IpcService } from '~/services/ipc';
import { createWriteStream } from 'node:fs';
import { HTTPService } from '~/services/http';
import { finished } from 'node:stream/promises';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import { mkdir, unlink, readdir } from 'node:fs/promises';
import { dirExists, fileExists } from '@depthbomb/node-common/fs';
import type { IBootstrappable } from '~/common';
import type { HTTPClient } from '~/services/http';

@injectable()
export class ThumbnailService implements IBootstrappable {
	private readonly httpClient: HTTPClient;
	private readonly cacheDir: string;

	public constructor(
		private readonly ipc    = inject(IpcService),
		private readonly logger = inject(LoggingService),
		private readonly http   = inject(HTTPService),
	) {
		this.httpClient = this.http.getClient('ThumbnailService', { userAgent: USER_AGENT });
		this.cacheDir   = join(app.getPath('userData'), 'thumbnail_cache');
	}

	public async bootstrap() {
		this.ipc.registerHandler('thumbnail<-clear-cache', () => this.clearCache());
	}

	public async downloadThumbnail(videoID: string) {
		const thumbnailPath   = join(this.cacheDir, `${videoID}.jpg`);
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

		const url = `https://i.ytimg.com/vi/${videoID}/maxresdefault.jpg`;
		const res = await this.httpClient.get(url);
		const fs  = createWriteStream(thumbnailPath);

		await finished(Readable.fromWeb(res.body!).pipe(fs));

		this.logger.info('Wrote thumbnail to disk', { url, thumbnailPath });
	}

	public async getThumbnail(videoID: string) {
		const thumbnailPath   = join(this.cacheDir, `${videoID}.jpg`);
		const thumbnailExists = await fileExists(thumbnailPath);
		if (!thumbnailExists) {
			this.logger.warn('No thumbnail found?', { thumbnailPath });
			return null;
		}

		return thumbnailPath;
	}

	private async clearCache() {
		const files = await readdir(this.cacheDir);
		if (!files.length) {
			await dialog.showMessageBox({
				title: 'Clear thumbnail cache',
				message: 'No thumbnails to clear.'
			});
			return;
		}

		for (const file of files) {
			await unlink(
				join(this.cacheDir, file)
			);
		}

		await dialog.showMessageBox({
			title: 'Clear thumbnail cache',
			message: `Deleted ${files.length} thumbnail(s).`
		});
	}
}
