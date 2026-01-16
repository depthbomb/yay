import { app } from 'electron';
import { ok } from 'shared/ipc';
import { Readable } from 'node:stream';
import { USER_AGENT } from '~/constants';
import { IPCService } from '~/services/ipc';
import { HTTPService } from '~/services/http';
import { finished } from 'node:stream/promises';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import { Path } from '@depthbomb/node-common/pathlib';
import type { IBootstrappable } from '~/common';
import type { HTTPClient } from '~/services/http';

@injectable()
export class ThumbnailService implements IBootstrappable {
	private readonly httpClient: HTTPClient;
	private readonly cacheDir: Path;

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
	}

	public async downloadThumbnail(videoID: string) {
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
		const fs  = thumbnailPath.toWriteStream();

		await finished(Readable.fromWeb(res.body!).pipe(fs));

		this.logger.info('Wrote thumbnail to disk', { url, thumbnailPath });
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
		for await (const file of this.cacheDir.iterdir()) {
			await file.unlink();
		}

		return ok();
	}
}
