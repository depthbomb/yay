import { ipcRenderer, contextBridge } from 'electron';
import { IpcChannel, IpcChannels, SettingsKey } from 'shared';
import { arch, type, release, platform, hostname } from 'node:os';
import type { IpcRendererEvent, MessageBoxOptions } from 'electron';
import type { IpcApi, CoreApi, SystemApi, VersionsApi, SettingsApi, FeatureFlagsApi } from 'shared';

const versionsApi = process.versions satisfies VersionsApi;

const ipcApi = {
	on(channel: IpcChannel, listener: (...args: any[]) => void) {
		if (!IpcChannels.includes(channel)) {
			if (__STRICT__) {
				throw new Error(`Attempted to listen to invalid channel: ${channel}`);
			}

			console.error('Attempted to listen to invalid channel', { channel });
			return () => {};
		}

		const cb = (_: IpcRendererEvent, ...args: any[]) => listener(...args);

		ipcRenderer.on(channel, cb);
		return () => ipcRenderer.removeListener(channel, cb);
	},
	once(channel: IpcChannel, listener: (...args: any[]) => void) {
		if (!IpcChannels.includes(channel)) {
			if (__STRICT__) {
				throw new Error(`Attempted to listen to invalid channel: ${channel}`);
			}

			console.error('Attempted to listen to invalid channel', { channel });
			return;
		}

		ipcRenderer.once(channel, (_, ...args) => listener(...args));
	},
	off (channel: IpcChannel, listener: (...args: any[]) => void) {
		if (!IpcChannels.includes(channel)) {
			if (__STRICT__) {
				throw new Error(`Attempted to remove listener from invalid channel: ${channel}`);
			}

			console.error('Attempted to remove listener from invalid channel', { channel });
			return;
		}

		ipcRenderer.removeListener(channel, listener);
	},
	removeAllListeners (channel: IpcChannel) {
		if (!IpcChannels.includes(channel)) {
			if (__STRICT__) {
				throw new Error(`Attempted to remove listeners from invalid channel: ${channel}`);
			}

			console.error('Attempted to remove listeners from invalid channel', { channel });
			return;
		}

		ipcRenderer.removeAllListeners(channel);
	}
} satisfies IpcApi;

const coreApi = {
	showMessageBox(options: MessageBoxOptions) {
		return ipcRenderer.invoke(IpcChannel.ShowMessageBox, options);
	},
	showTextSelectionMenu(type: 'input' | 'input-selection' | 'text-selection') {
		return ipcRenderer.invoke(IpcChannel.ShowTextSelectionMenu, type);
	},
	//
	minimizeWindow(windowName: string) {
		return ipcRenderer.invoke(IpcChannel.Window_Minimize, windowName);
	},
	//
	openDownloadDir() {
		return ipcRenderer.invoke(IpcChannel.Main_OpenDownloadDir);
	},
	openDownloadDirPicker() {
		return ipcRenderer.invoke(IpcChannel.Main_PickDownloadDir);
	},
	openCookiesFilePicker() {
		return ipcRenderer.invoke(IpcChannel.Main_PickCookiesFile);
	},
	toggleWindowPinned() {
		return ipcRenderer.invoke(IpcChannel.Main_ToggleWindowPinned);
	},
	openLogFile() {
		return ipcRenderer.invoke(IpcChannel.Main_OpenLogFile);
	},
	openAppData() {
		return ipcRenderer.invoke(IpcChannel.Main_OpenAppData);
	},
	//
	cancelSetup() {
		return ipcRenderer.invoke(IpcChannel.Setup_Cancel);
	},
	//
	getSettingsValue(key: SettingsKey, defaultValue?: any, secure: boolean = false) {
		return ipcRenderer.invoke(IpcChannel.Settings_Get, key, defaultValue, secure);
	},
	setSettingsValue(key: SettingsKey, value: any, secure: boolean = false) {
		return ipcRenderer.invoke(IpcChannel.Settings_Set, key, value, secure);
	},
	resetSettings() {
		return ipcRenderer.invoke(IpcChannel.Settings_Reset);
	},
	showSettingsUI() {
		return ipcRenderer.invoke(IpcChannel.Settings_ShowUi);
	},
	//
	downloadVideo(url: string) {
		return ipcRenderer.invoke(IpcChannel.Ytdlp_DownloadVideo, url);
	},
	downloadAudio(url: string) {
		return ipcRenderer.invoke(IpcChannel.Ytdlp_DownloadAudio, url);
	},
	downloadDefault(url: string) {
		return ipcRenderer.invoke(IpcChannel.Ytdlp_DownloadDefault, url);
	},
	removeCookiesFile() {
		return ipcRenderer.invoke(IpcChannel.Ytdlp_RemoveCookiesFile);
	},
	cancelDownload() {
		return ipcRenderer.invoke(IpcChannel.Ytdlp_CancelDownload);
	},
	recheckBinaries() {
		return ipcRenderer.invoke(IpcChannel.Ytdlp_RecheckBinaries);
	},
	updateYtdlpBinary() {
		return ipcRenderer.invoke(IpcChannel.Ytdlp_UpdateBinary);
	},
	//
	enableAutoStart() {
		return ipcRenderer.invoke(IpcChannel.Autostart_Enable);
	},
	disableAutoStart() {
		return ipcRenderer.invoke(IpcChannel.Autostart_Disable);
	},
	toggleAutoStart() {
		return ipcRenderer.invoke(IpcChannel.Autostart_Toggle);
	},
	//
	enableGlobalMenu() {
		return ipcRenderer.invoke(IpcChannel.GlobalMenu_Enable);
	},
	disableGlobalMenu() {
		return ipcRenderer.invoke(IpcChannel.GlobalMenu_Disable);
	},
	toggleGlobalMenu() {
		return ipcRenderer.invoke(IpcChannel.GlobalMenu_Toggle);
	},
	//
	showUpdaterWindow() {
		return ipcRenderer.invoke(IpcChannel.Updater_ShowWindow);
	},
	getLatestRelease() {
		return ipcRenderer.invoke(IpcChannel.Updater_GetLatestRelease);
	},
	getLatestChangelog() {
		return ipcRenderer.invoke(IpcChannel.Updater_GetLatestChangelog);
	},
	getCommitsSinceBuild() {
		return ipcRenderer.invoke(IpcChannel.Updater_GetCommitsSinceBuild);
	},
	checkForUpdates() {
		return ipcRenderer.invoke(IpcChannel.Updater_CheckForUpdates, true);
	},
	startUpdate() {
		return ipcRenderer.invoke(IpcChannel.Updater_Update);
	},
	cancelUpdate() {
		return ipcRenderer.invoke(IpcChannel.Updater_Cancel);
	},
} satisfies CoreApi;

const systemApi = { arch, type, release, platform, hostname } satisfies SystemApi;

const settingsApi = {
	getValue: (key: SettingsKey, defaultValue?: unknown, secure?: boolean) => ipcRenderer.sendSync(IpcChannel.Settings_Get, key, defaultValue, secure)
} satisfies SettingsApi;

const featureFlagsApi = {
	getFeatureFlags: () => ipcRenderer.sendSync(IpcChannel.FeatureFlag_GetFeatureFlags)
} satisfies FeatureFlagsApi;

contextBridge.exposeInMainWorld('versions', versionsApi);
contextBridge.exposeInMainWorld('buildDate', new Date(__BUILD_DATE__));
contextBridge.exposeInMainWorld('ipc', ipcApi);
contextBridge.exposeInMainWorld('api', coreApi);
contextBridge.exposeInMainWorld('system', systemApi);
contextBridge.exposeInMainWorld('settings', settingsApi);
contextBridge.exposeInMainWorld('featureFlags', featureFlagsApi);
