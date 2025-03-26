import type { IpcChannel } from './ipc';
import type { SettingsKey } from './settings';
import type { MessageBoxOptions, MessageBoxReturnValue } from 'electron';

export type Awaitable<T> = PromiseLike<T> | T;
export type Maybe<T>     = T | undefined;
export type Nullable<T>  = T | null;

export type VersionsApi = typeof process.versions;

export type IpcApi = {
	on: (channel: IpcChannel, listener: (...args: any[]) => void) => () => void;
	once: (channel: IpcChannel, listener: (...args: any[]) => void) => void;
	off: (channel: IpcChannel, listener: (...args: any[]) => void) => void;
	removeAllListeners: (channel: IpcChannel) => void;
};

export type CoreApi = {
	showMessageBox(options: MessageBoxOptions): Promise<MessageBoxReturnValue>;
	//
	minimizeWindow(windowName: string): Promise<void>;
	showInputRightClickMenu(): Promise<void>;
	openDownloadDir(): Promise<void>;
	openDownloadDirPicker(): Promise<void>;
	toggleWindowPinned(): Promise<boolean>;
	//
	cancelSetup(): Promise<void>;
	//
	getSettingsValue<T>(key: SettingsKey, defaultValue?: any, secure?: boolean): Promise<T>;
	setSettingsValue(key: SettingsKey, value: any, secure?: boolean): Promise<void>;
	resetSettings(): Promise<void>;
	//
	downloadVideo(url: string): Promise<void>;
	downloadAudio(url: string): Promise<void>;
	downloadDefault(url: string): Promise<void>;
	cancelDownload(): Promise<void>;
	recheckBinaries(): Promise<void>;
	updateYtdlpBinary(): Promise<void>;
	//
	getAutoStart(): Promise<boolean>;
	enableAutoStart(): Promise<void>;
	disableAutoStart(): Promise<void>;
	toggleAutoStart(): Promise<boolean>;
	//
	getGlobalMenuEnabled(): Promise<boolean>;
	enableGlobalMenu(): Promise<void>;
	disableGlobalMenu(): Promise<void>;
	toggleGlobalMenu(): Promise<boolean>;
	//
	showUpdaterWindow(): Promise<void>;
	getLatestRelease(): Promise<{html_url: string; tag_name: string; created_at: string; body: string}>;
	startUpdate(): Promise<void>;
	cancelUpdate(): Promise<void>;
};

export type SystemApi = {
	arch: () => string;
	type: () => string;
	release: () => string;
	platform: () => NodeJS.Platform;
	hostname: () => string;
};

export type SettingsApi = {
	getValue: <T>(key: SettingsKey, defaultValue?: unknown, secure?: boolean) => T
};
