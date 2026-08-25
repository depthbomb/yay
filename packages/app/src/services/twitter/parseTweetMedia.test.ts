import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTweetMedia } from './parseTweetMedia';

test('validates and returns Twitter video metadata', () => {
	const media = parseTweetMedia({
		mediaDetails: [{
			media_url_https: 'https://pbs.twimg.com/media/example.jpg',
			video_info: {
				variants: [{
					bitrate: 832_000,
					content_type: 'video/mp4',
					url: 'https://video.twimg.com/ext_tw_video/example.mp4',
				}],
			},
		}],
	});

	assert.equal(media?.mediaDetails.length, 1);
});

test('returns null for tweets without video and rejects malformed hosts', () => {
	assert.equal(parseTweetMedia({
		mediaDetails: [{ media_url_https: 'https://pbs.twimg.com/media/example.jpg' }],
	}), null);

	assert.throws(() => parseTweetMedia({
		mediaDetails: [{
			media_url_https: 'https://pbs.twimg.com.evil.example/image.jpg',
			video_info: { variants: [] },
		}],
	}), /invalid image URL/);
});
