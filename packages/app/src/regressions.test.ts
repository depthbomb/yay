import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedExternalURL } from './externalURL';
import { toTaskbarProgress } from './services/mainWindow/toTaskbarProgress';

test('taskbar progress converts percentages to bounded fractions', () => {
	assert.equal(toTaskbarProgress(0), 0);
	assert.equal(toTaskbarProgress(50), 0.5);
	assert.equal(toTaskbarProgress(100), 1);
	assert.equal(toTaskbarProgress(150), 1);
	assert.equal(toTaskbarProgress(Number.NaN), 0);
});

test('external URL allowlist rejects insecure and lookalike hosts', () => {
	assert.equal(isAllowedExternalURL(new URL('https://github.com/depthbomb/yay')), true);
	assert.equal(isAllowedExternalURL(new URL('https://docs.electronjs.org')), true);
	assert.equal(isAllowedExternalURL(new URL('http://electronjs.org')), false);
	assert.equal(isAllowedExternalURL(new URL('https://notelectronjs.org')), false);
	assert.equal(isAllowedExternalURL(new URL('https://github.com.example.com')), false);
});
