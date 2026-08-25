import type { Nullable, ITweetMedia } from 'shared';

export const parseTweetMedia = (value: unknown): Nullable<ITweetMedia> => {
	if (!isRecord(value) || !Array.isArray(value.mediaDetails)) {
		throw new Error('Tweet lookup returned an invalid response.');
	}

	const mediaDetails = value.mediaDetails
		.filter(isRecord)
		.map(detail => {
			if (typeof detail.media_url_https !== 'string' || !isAllowedURL(detail.media_url_https, 'pbs.twimg.com')) {
				throw new Error('Tweet lookup returned an invalid image URL.');
			}
			if (!isRecord(detail.video_info) || !Array.isArray(detail.video_info.variants)) {
				return null;
			}

			const variants = detail.video_info.variants.map(variant => {
				if (
					!isRecord(variant)
					|| typeof variant.content_type !== 'string'
					|| typeof variant.url !== 'string'
					|| !isAllowedURL(variant.url, 'video.twimg.com')
					|| (variant.bitrate !== undefined && (typeof variant.bitrate !== 'number' || !Number.isFinite(variant.bitrate)))
				) {
					throw new Error('Tweet lookup returned invalid video details.');
				}

				return { content_type: variant.content_type, url: variant.url, bitrate: variant.bitrate };
			});

			return { media_url_https: detail.media_url_https, video_info: { variants } };
		})
		.filter(detail => detail !== null);

	return mediaDetails.length > 0 ? { mediaDetails } : null;
};

const isAllowedURL = (input: string, hostname: string) => {
	try {
		const url = new URL(input);
		return url.protocol === 'https:' && url.hostname === hostname;
	} catch {
		return false;
	}
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);
