import test from 'node:test';
import assert from 'node:assert/strict';
import { parseUpdateOutput } from './parseUpdateOutput';

test('yt-dlp updater output distinguishes updates from current versions', () => {
	assert.deepEqual(parseUpdateOutput('Updating to stable@2026.08.24 ... Updated yt-dlp'), {
		version: 'stable@2026.08.24',
		updated: true,
	});
	assert.deepEqual(parseUpdateOutput('yt-dlp is up to date (stable@2026.08.24)'), {
		version: 'stable@2026.08.24',
		updated: false,
	});
});
