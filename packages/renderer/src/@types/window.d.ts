import type { IpcChannel } from 'shared';
import type { MessageBoxOptions, MessageBoxReturnValue } from 'electron';

declare global {
	interface Window {
		buildDate: Date;
		gitHash: string;
		versions: {
			electron: string;
			chrome: string;
			node: string;
			v8: string;
		};
		ipc: {
			on: (channel: IpcChannel, listener: (...args: any[]) => void) => () => void;
			once: (channel: IpcChannel, listener: (...args: any[]) => void) => void;
			off: (channel: string, listener: (...args: any[]) => void) => void;
			removeAllListeners: (channel: string) => void;
		};
		api: {
			minimizeWindow(windowName: string): Promise<void>;
			playNotificationSound(): Promise<void>;
			showInputRightClickMenu(): Promise<void>;
			openDownloadDir(): Promise<void>;
			openDownloadDirPicker(): Promise<void>;
			toggleWindowPinned(): Promise<boolean>;
			showMessageBox(options: MessageBoxOptions): Promise<MessageBoxReturnValue>;
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
			checkForYtdlpUpdate(): Promise<boolean>;
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
		};
		system: {
			arch: () => string;
			type: () => string;
			release: () => string;
			platform: () => string;
			hostname: () => string;
		}
		settings: {
			getValue: <T>(key: string, defaultValue?: unknown, secure?: boolean) => T;
		};
	}
}
