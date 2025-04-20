import type { IpcApi, CoreApi, SystemApi, VersionsApi, SettingsApi, FeatureFlagsApi } from 'shared';

declare global {
	interface Window {
		buildDate: Date;
		versions: VersionsApi;
		ipc: IpcApi;
		api: CoreApi;
		system: SystemApi;
		settings: SettingsApi;
		featureFlags: FeatureFlagsApi;
	}
}
