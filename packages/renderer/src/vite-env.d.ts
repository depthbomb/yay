/// <reference types="vite/client" />

import type { IPCAPI, SystemAPI, VersionsAPI, FeatureFlagsAPI } from 'shared';

declare global {
	interface Window {
		buildDate: Date;
		versions: VersionsAPI;
		ipc: IPCAPI;
		system: SystemAPI;
		featureFlags: FeatureFlagsAPI;
	}
}
