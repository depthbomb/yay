import type { IpcApi, SystemApi, VersionsApi, SettingsApi, FeatureFlagsApi } from 'shared';

declare global {
	interface Window {
		buildDate: Date;
		versions: VersionsApi;
		ipc: IpcApi;
		system: SystemApi;
		settings: SettingsApi;
		featureFlags: FeatureFlagsApi;
	}
}
