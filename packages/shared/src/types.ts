import type { SettingsKey } from './settings';
import type { Endpoints } from '@octokit/types';
import type { IIpcEvents, IIpcContract, IpcChannel } from '.';
import type { MessageBoxOptions, MessageBoxReturnValue } from 'electron';

export type Awaitable<T> = PromiseLike<T> | T;
export type Maybe<T>     = T | undefined;
export type Nullable<T>  = T | null;

export type VersionsApi = typeof process.versions;

export type IpcApi = {
	invoke<K extends keyof IIpcContract>(channel: K, ...args: IIpcContract[K]['args']): Promise<IIpcContract[K]['return']>;
	sendSync<K extends keyof IIpcContract>(channel: K, ...args: IIpcContract[K]['args']): Nullable<IIpcContract[K]['return']>;
	on<K extends keyof IIpcEvents>(channel: K, listener: (payload: IIpcEvents[K]) => void): () => void;
	once<K extends keyof IIpcEvents>(channel: K, listener: (payload: IIpcEvents[K]) => void): void;
	off<K extends keyof IIpcEvents>(channel: K, listener: (payload: IIpcEvents[K]) => void): void;
	removeAllListeners: (channel: IpcChannel) => void;
};

// export type CoreApi = {
// 	showMessageBox(options: MessageBoxOptions): Promise<MessageBoxReturnValue>;
// 	showTextSelectionMenu(type: 'input' | 'input-selection' | 'text-selection'): Promise<void>;
// 	//
// 	minimizeWindow(windowName: string): Promise<void>;
// 	openDownloadDir(): Promise<void>;
// 	openDownloadDirPicker(): Promise<void>;
// 	openCookiesFilePicker(): Promise<void>;
// 	toggleWindowPinned(): Promise<boolean>;
// 	openLogFile(): Promise<void>;
// 	openAppData(): Promise<void>;
// 	//
// 	cancelSetup(): Promise<void>;
// 	//
// 	getSettingsValue<T>(key: SettingsKey, defaultValue?: any, secure?: boolean): Promise<T>;
// 	setSettingsValue(key: SettingsKey, value: any, secure?: boolean): Promise<void>;
// 	resetSettings(): Promise<void>;
// 	showSettingsUI(): Promise<void>;
// 	//
// 	downloadVideo(url: string): Promise<void>;
// 	downloadAudio(url: string): Promise<void>;
// 	downloadDefault(url: string): Promise<void>;
// 	removeCookiesFile(): Promise<void>;
// 	cancelDownload(): Promise<void>;
// 	recheckBinaries(): Promise<void>;
// 	updateYtdlpBinary(): Promise<void>;
// 	//
// 	enableAutoStart(): Promise<void>;
// 	disableAutoStart(): Promise<void>;
// 	toggleAutoStart(): Promise<boolean>;
// 	//
// 	enableGlobalMenu(): Promise<void>;
// 	disableGlobalMenu(): Promise<void>;
// 	toggleGlobalMenu(): Promise<boolean>;
// 	//
// 	showUpdaterWindow(): Promise<void>;
// 	getLatestRelease(): Promise<Endpoints['GET /repos/{owner}/{repo}/releases']['response']['data'][number]>;
// 	getLatestChangelog(): Promise<string>;
// 	getCommitsSinceBuild(): Promise<Endpoints['GET /repos/{owner}/{repo}/commits']['response']['data']>;
// 	checkForUpdates(): Promise<boolean>;
// 	startUpdate(): Promise<void>;
// 	cancelUpdate(): Promise<void>;
// };

export type SystemApi = {
	arch: () => string;
	type: () => string;
	release: () => string;
	platform: () => NodeJS.Platform;
	hostname: () => string;
};

export type SettingsApi = {
	getValue(...args: IIpcContract['settings<-get']['args']): Nullable<IIpcContract['settings<-get']['return']>;
};

export type FeatureFlagsApi = {
	getFeatureFlags(...args: IIpcContract['feature-flag<-get-feature-flags']['args']): IIpcContract['feature-flag<-get-feature-flags']['return'];
};
