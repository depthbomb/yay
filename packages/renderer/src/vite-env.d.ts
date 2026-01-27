/// <reference types="vite/client" />

import type { IPCAPI, SystemAPI, VersionsAPI, SettingsAPI, FeatureFlagsAPI } from 'shared';

declare global {
	interface Window {
		buildDate: Date;
		versions: VersionsAPI;
		ipc: IPCAPI;
		system: SystemAPI;
		settings: SettingsAPI;
		featureFlags: FeatureFlagsAPI;
	}
}
