import { ok, err } from 'shared/ipc';
import { IPCService } from '~/services/ipc';
import { HTTPService } from '~/services/http';
import { BROWSER_USER_AGENT } from '~/constants';
import { inject, injectable } from '@needle-di/core';
import { Path } from '@depthbomb/node-common/pathlib';
import { SettingsService } from '~/services/settings';
import { ESettingsKey, tweetURLPattern } from 'shared';
import { CancellationTokenSource } from '@depthbomb/node-common/cancellation';
import type { IBootstrappable } from '~/common';
import type { HTTPClient } from '~/services/http';
import type { Nullable, ITweetMedia } from 'shared';

@injectable()
export class TwitterService implements IBootstrappable {
	private readonly client: HTTPClient;
	private readonly tweetMediaInfoCache = new Map<string, Nullable<ITweetMedia>>();
	private readonly cts                 = new CancellationTokenSource();

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
		const res = await this.client.get(url);
		if (!res.ok) {
			return err(res.statusText);
		}

		const filename   = new URL(url).pathname.split('/').pop()!;
		const outputPath = new Path(this.settings.get(ESettingsKey.DownloadDir), filename);

		await this.client.downloadWithProgress(res, outputPath, {
			// TODO: implement cancellation
			signal: this.cts.token.toAbortSignal()
		});

		return ok();
	}

	private async getMediaDetails(input: string) {
		let tweetID = input;

		const match = tweetURLPattern.exec(input);
		if (match) {
			tweetID = match[2];
		}

		if (this.tweetMediaInfoCache.has(tweetID)) {
			return ok(this.tweetMediaInfoCache.get(tweetID)!);
		}

		const url  = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetID}&token=!`;
		const res  = await this.client.get(url);
		const data = await res.json() as ITweetMedia;

		if (!data.mediaDetails.filter(d => d.video_info !== undefined).length) {
			this.tweetMediaInfoCache.set(tweetID, null);
			return ok(null);
		}

		this.tweetMediaInfoCache.set(tweetID, data);

		return ok(data);
	}
}
