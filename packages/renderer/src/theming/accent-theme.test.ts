import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccentTheme } from './accent-theme';

test('creates the existing shade scale from an Electron RGBA accent color', () => {
	const theme = createAccentTheme('0078d4ff');

	assert.equal(theme?.[50].color, 'rgb(230, 242, 251)');
	assert.equal(theme?.[500].color, 'rgb(0, 120, 212)');
	assert.equal(theme?.[950].color, 'rgb(0, 18, 32)');
});

test('chooses the foreground with the higher WCAG contrast ratio', () => {
	const theme = createAccentTheme('0078d4ff');

	assert.equal(theme?.[300].contrast, '#000000');
	assert.equal(theme?.[500].contrast, '#000000');
	assert.equal(theme?.[600].contrast, '#ffffff');
});

test('accepts CSS-style RGB hex and rejects malformed colors', () => {
	assert.equal(createAccentTheme('#0078d4')?.[500].color, 'rgb(0, 120, 212)');
	assert.equal(createAccentTheme('not-a-color'), null);
});
