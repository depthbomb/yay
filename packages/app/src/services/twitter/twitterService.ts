import { ok, err } from 'shared/ipc';
import { IPCService } from '~/services/ipc';
import { HTTPService } from '~/services/http';
import { BROWSER_USER_AGENT } from '~/constants';
import { inject, injectable } from '@needle-di/core';
import { Path } from '@depthbomb/node-common/pathlib';
import { SettingsService } from '~/services/settings';
import { parseTweetMedia } from './parseTweetMedia';
import { ESettingsKey, tweetURLPattern } from 'shared';
import { CancellationTokenSource } from '@depthbomb/node-common/cancellation';
import type { IBootstrappable } from '~/common';
import type { HTTPClient } from '~/services/http';
import type { Nullable, ITweetMedia } from 'shared';

@injectable()
export class TwitterService implements IBootstrappable {
	private readonly client: HTTPClient;
	private readonly tweetMediaInfoCache = new Map<string, { value: Nullable<ITweetMedia>; expiresAt: number }>();
	private readonly cts                 = new CancellationTokenSource();
	private readonly cacheTTL            = 15 * 60 * 1_000;
	private readonly maxCacheEntries     = 100;

	public constructor(
		private readonly ipc      = inject(IPCService),
		private readonly settings = inject(SettingsService),
		private readonly http     = inject(HTTPService),
	) {
		this.client = this.http.getClient(TwitterService.name, { userAgent: BROWSER_USER_AGENT });
	}

	public async bootstrap() {
		this.ipc.registerHandler('twitter<-get-tweet-media-info', (_, url) => this.getMediaDetails(url));
		this.ipc.registerHandler('twitter<-download-media-url',   (_, url) => this.download(url));
	}

	private async download(url: string) {
		try {
			const mediaURL = new URL(url);
			if (mediaURL.protocol !== 'https:' || mediaURL.hostname !== 'video.twimg.com') {
				return err('The requested media URL is not allowed.');
			}

			const filename = mediaURL.pathname.split('/').pop();
			if (!filename) {
				return err('The requested media URL has no filename.');
			}

			const res = await this.client.get(mediaURL);
			if (!res.ok || !res.body) {
				return err(`Media request failed with HTTP ${res.status}.`);
			}

			const outputPath = new Path(this.settings.get(ESettingsKey.DownloadDir), filename);
			await this.client.downloadWithProgress(res, outputPath, {
				// TODO: implement cancellation
				signal: this.cts.token.toAbortSignal()
			});

			return ok();
		} catch (error) {
			return err(error instanceof Error ? error.message : String(error));
		}
	}

	private async getMediaDetails(input: string) {
		const match = tweetURLPattern.exec(input);
		if (!match) {
			return err('Invalid Twitter/X status URL.');
		}
		const tweetID = match[2];

		const cached = this.tweetMediaInfoCache.get(tweetID);
		if (cached && cached.expiresAt > Date.now()) {
			this.tweetMediaInfoCache.delete(tweetID);
			this.tweetMediaInfoCache.set(tweetID, cached);
			return ok(cached.value);
		}
		this.tweetMediaInfoCache.delete(tweetID);

		try {
			const url = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetID}&token=!`;
			const res = await this.client.get(url);
			if (!res.ok) {
				return err(`Tweet lookup failed with HTTP ${res.status}.`);
			}

			const data = parseTweetMedia(await res.json());
			this.cacheMediaDetails(tweetID, data);

			return ok(data);
		} catch (error) {
			return err(error instanceof Error ? error.message : String(error));
		}
	}

	private cacheMediaDetails(tweetID: string, value: Nullable<ITweetMedia>) {
		if (this.tweetMediaInfoCache.size >= this.maxCacheEntries) {
			const oldestKey = this.tweetMediaInfoCache.keys().next().value;
			if (oldestKey) {
				this.tweetMediaInfoCache.delete(oldestKey);
			}
		}

		this.tweetMediaInfoCache.set(tweetID, { value, expiresAt: Date.now() + this.cacheTTL });
	}
}
