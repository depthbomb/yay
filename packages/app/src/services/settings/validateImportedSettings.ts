import { ESettingsKey, SettingsKeys } from 'shared';
import type { Settings } from './types';

const booleanKeys = new Set<ESettingsKey>([
	ESettingsKey.EnableNewReleaseToast,
	ESettingsKey.EnableGlobalMenu,
	ESettingsKey.AutoStart,
	ESettingsKey.HideSetupWindow,
	ESettingsKey.UseThumbnailForCoverArt,
	ESettingsKey.EnableDownloadCompletionToast,
	ESettingsKey.SkipYoutubePlaylists,
	ESettingsKey.DisableHardwareAcceleration,
	ESettingsKey.UpdateYtdlpOnStartup,
	ESettingsKey.UseNewTwitterVideoDownloader,
	ESettingsKey.EnableLocalApiServer,
]);

const stringKeys = new Set<ESettingsKey>([
	ESettingsKey.DownloadDir,
	ESettingsKey.DownloadNameTemplate,
	ESettingsKey.YtdlpPath,
	ESettingsKey.DenoPath,
]);

export const validateImportedSettings = (input: unknown): Settings => {
	if (!isRecord(input)) {
		throw new Error('Invalid exported settings file: settings data must be an object.');
	}

	const knownKeys = new Set<string>(SettingsKeys);
	for (const [key, value] of Object.entries(input)) {
		if (!knownKeys.has(key)) {
			throw new Error(`Invalid exported settings file: unknown setting "${key}".`);
		}

		validateSetting(key as ESettingsKey, value);
	}

	return { ...input } as Settings;
};

const validateSetting = (key: ESettingsKey, value: unknown) => {
	if (booleanKeys.has(key)) {
		assert(typeof value === 'boolean', key, 'a boolean');
		return;
	}

	if (stringKeys.has(key)) {
		assert(typeof value === 'string' && value.length > 0 && value.length <= 32_767, key, 'a non-empty string');
		return;
	}

	switch (key) {
		case ESettingsKey.LocalApiServerToken:
			throw new Error('Invalid exported settings file: API credentials cannot be imported.');
		case ESettingsKey.CookiesFilePath:
			assert(value === null || (typeof value === 'string' && value.length <= 32_767), key, 'a file path or null');
			break;
		case ESettingsKey.DefaultDownloadAction:
			assert(value === 'audio' || value === 'video', key, '"audio" or "video"');
			break;
		case ESettingsKey.LocalApiServerPort:
			assert(Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 65_535, key, 'an integer from 1 to 65535');
			break;
		default:
			throw new Error(`Invalid exported settings file: unsupported setting "${key}".`);
	}
};

function assert(condition: boolean, key: ESettingsKey, expected: string): asserts condition {
	if (!condition) {
		throw new Error(`Invalid exported settings file: "${key}" must be ${expected}.`);
	}
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);
