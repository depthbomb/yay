import assert from 'node:assert/strict';
import test from 'node:test';
import {
	getAssetSHA256,
	isNewerStableRelease,
	isTrustedReleaseAssetURL,
	isTrustedReleaseDownloadURL,
	parseChecksumText,
} from './updaterValidation';
import type { GitHubRelease } from 'shared';

const release = (tag: string, overrides: Partial<GitHubRelease> = {}): GitHubRelease => ({
	tag_name: tag,
	prerelease: false,
	draft: false,
	body: '- Changes',
	assets: [],
	...overrides,
});

test('only newer stable semantic versions are treated as updates', () => {
	assert.equal(isNewerStableRelease(release('v1.42.0'), '1.41.0'), true);
	assert.equal(isNewerStableRelease(release('1.41.0'), '1.41.0'), false);
	assert.equal(isNewerStableRelease(release('1.42.0', { draft: true }), '1.41.0'), false);
	assert.equal(isNewerStableRelease(release('1.42.0-beta.1', { prerelease: true }), '1.41.0'), false);
	assert.equal(isNewerStableRelease(release('not-a-version'), '1.41.0'), false);
});

test('release checksums require a valid digest or the exact installer filename', () => {
	const hash = 'a'.repeat(64);
	assert.equal(getAssetSHA256({ name: 'yay-setup.exe', browser_download_url: '', size: 1, digest: `sha256:${hash.toUpperCase()}` }), hash);
	assert.equal(getAssetSHA256({ name: 'yay-setup.exe', browser_download_url: '', size: 1, digest: 'sha1:bad' }), null);
	assert.equal(parseChecksumText(`${hash}  yay-setup.exe\n`, 'yay-setup.exe'), hash);
	assert.equal(parseChecksumText(`${hash}  another.exe\n`, 'yay-setup.exe'), null);
});

test('release downloads only accept expected HTTPS GitHub hosts and paths', () => {
	assert.equal(isTrustedReleaseAssetURL('https://github.com/depthbomb/yay/releases/download/1.42.0/yay-setup.exe', 'depthbomb', 'yay'), true);
	assert.equal(isTrustedReleaseAssetURL('https://github.com/depthbomb/other/releases/download/1.42.0/yay-setup.exe', 'depthbomb', 'yay'), false);
	assert.equal(isTrustedReleaseAssetURL('https://github.com.evil.example/depthbomb/yay/releases/download/1.42.0/yay-setup.exe', 'depthbomb', 'yay'), false);
	assert.equal(isTrustedReleaseDownloadURL('https://release-assets.githubusercontent.com/github-production-release-asset/file'), true);
	assert.equal(isTrustedReleaseDownloadURL('https://release-assets.githubusercontent.com.evil.example/file'), false);
});
