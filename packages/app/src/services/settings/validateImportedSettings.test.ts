import test from 'node:test';
import { ESettingsKey } from 'shared';
import assert from 'node:assert/strict';
import { validateImportedSettings } from './validateImportedSettings';

test('accepts known settings with valid values', () => {
	const settings = validateImportedSettings({
		[ESettingsKey.EnableGlobalMenu]: false,
		[ESettingsKey.DefaultDownloadAction]: 'audio',
		[ESettingsKey.LocalApiServerPort]: 9876,
		[ESettingsKey.CookiesFilePath]: null,
	});

	assert.equal(settings[ESettingsKey.DefaultDownloadAction], 'audio');
});

test('rejects unknown, wrongly typed, and unsafe settings', () => {
	assert.throws(() => validateImportedSettings({ surprise: true }), /unknown setting/);
	assert.throws(() => validateImportedSettings({ [ESettingsKey.EnableGlobalMenu]: 'yes' }), /must be a boolean/);
	assert.throws(() => validateImportedSettings({ [ESettingsKey.LocalApiServerPort]: 70_000 }), /1 to 65535/);
	assert.throws(() => validateImportedSettings({ [ESettingsKey.LocalApiServerToken]: 'credential' }), /cannot be imported/);
});
