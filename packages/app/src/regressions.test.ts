import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedExternalURL } from './externalURL';
import { toTaskbarProgress } from './services/mainWindow/toTaskbarProgress';
import { getTaskbarPosition } from './services/windowPosition/taskbarPosition';

test('taskbar progress converts percentages to bounded fractions', () => {
	assert.equal(toTaskbarProgress(0), 0);
	assert.equal(toTaskbarProgress(50), 0.5);
	assert.equal(toTaskbarProgress(100), 1);
	assert.equal(toTaskbarProgress(150), 1);
	assert.equal(toTaskbarProgress(Number.NaN), 0);
});

test('taskbar position is detected relative to each display', () => {
	const bounds = { x: -1920, y: -200, width: 1920, height: 1080 };

	assert.equal(getTaskbarPosition(bounds, { ...bounds, y: -152, height: 1032 }, { x: -100, y: -200, width: 24, height: 48 }), 'top');
	assert.equal(getTaskbarPosition(bounds, { ...bounds, x: -1872, width: 1872 }, { x: -1920, y: 600, width: 48, height: 24 }), 'left');
	assert.equal(getTaskbarPosition(bounds, { ...bounds, width: 1872 }, { x: -48, y: 600, width: 48, height: 24 }), 'right');
	assert.equal(getTaskbarPosition(bounds, { ...bounds, height: 1032 }, { x: -100, y: 832, width: 24, height: 48 }), 'bottom');
});

test('auto-hidden taskbars are inferred from the tray icon edge', () => {
	const bounds = { x: 0, y: 0, width: 1920, height: 1080 };

	assert.equal(getTaskbarPosition(bounds, bounds, { x: 1890, y: 500, width: 24, height: 24 }), 'right');
});

test('external URL allowlist rejects insecure and lookalike hosts', () => {
	assert.equal(isAllowedExternalURL(new URL('https://github.com/depthbomb/yay')), true);
	assert.equal(isAllowedExternalURL(new URL('https://docs.electronjs.org')), true);
	assert.equal(isAllowedExternalURL(new URL('http://electronjs.org')), false);
	assert.equal(isAllowedExternalURL(new URL('https://notelectronjs.org')), false);
	assert.equal(isAllowedExternalURL(new URL('https://github.com.example.com')), false);
});
