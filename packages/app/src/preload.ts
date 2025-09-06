import { ipcRenderer, contextBridge } from 'electron';
import { IpcEvents, IpcChannel, IpcChannels } from 'shared';
import { arch, type, release, platform, hostname } from 'node:os';
import type { IpcApi, IIpcEvents, IIpcContract, SystemApi, VersionsApi, SettingsApi, FeatureFlagsApi } from 'shared';

type IpcArgs<K extends keyof IIpcContract> = IIpcContract[K]['args'];
type IpcReturn<K extends keyof IIpcContract> = IIpcContract[K]['return'];

const versionsApi = process.versions satisfies VersionsApi;

const ipcApi = {
	invoke<K extends keyof IIpcContract>(channel: K, ...args: IpcArgs<K>){
		if (!IpcChannels.includes(channel)) {
			if (__STRICT__) {
				throw new Error(`Attempted to invoke invalid channel: ${channel}`);
			}

			console.error('Attempted to invoke invalid channel', { channel, args });

			return Promise.reject(new Error(`Invalid channel: ${channel}`));
		}

		return ipcRenderer.invoke(channel, ...args) as Promise<IpcReturn<K>>;
	},
	sendSync<K extends keyof IIpcContract>(channel: K, ...args: IpcArgs<K>){
		if (!IpcChannels.includes(channel)) {
			if (__STRICT__) {
				throw new Error(`Attempted to invoke invalid channel: ${channel}`);
			}

			console.error('Attempted to invoke invalid channel', { channel, args });

			return null;
		}

		return ipcRenderer.sendSync(channel, ...args) as IpcReturn<K>;
	},
	on<K extends keyof IIpcEvents>(channel: K, listener: (payload: IIpcEvents[K]) => void) {
		if (!IpcEvents.includes(channel)) {
			if (__STRICT__) {
				throw new Error(`Attempted to listen to invalid channel: ${channel}`);
			}

			console.error('Attempted to listen to invalid channel', { channel });

			return () => {};
		}

		const wrapped = (_: Electron.IpcRendererEvent, payload: IIpcEvents[K]) => listener(payload);

		ipcRenderer.on(channel, wrapped);

		return () => ipcRenderer.removeListener(channel, wrapped);
	},
	once<K extends keyof IIpcEvents>(channel: K, listener: (payload: IIpcEvents[K]) => void) {
		if (!IpcEvents.includes(channel)) {
			if (__STRICT__) {
				throw new Error(`Attempted to listen to invalid channel: ${channel}`);
			}

			console.error('Attempted to listen to invalid channel', { channel });
			return;
		}

		const wrapped = (_: Electron.IpcRendererEvent, payload: IIpcEvents[K]) => listener(payload);

		ipcRenderer.once(channel, wrapped);
	},
	off<K extends keyof IIpcEvents>(channel: K, listener: (payload: IIpcEvents[K]) => void) {
		if (!IpcEvents.includes(channel)) {
			if (__STRICT__) {
				throw new Error(`Attempted to remove listener from invalid channel: ${channel}`);
			}

			console.error('Attempted to remove listener from invalid channel', { channel });
			return;
		}

		ipcRenderer.removeListener(channel, listener as any);
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

// const coreApi = {
// 	showMessageBox(...args: IpcArgs<'show-message-box'>) {
// 		return ipcApi.invoke('show-message-box', ...args);
// 	},
// 	showTextSelectionMenu(...args: IpcArgs<'show-text-selection-menu'>) {
// 		return ipcApi.invoke('show-text-selection-menu', ...args);
// 	},
// 	//
// 	minimizeWindow(...args: IpcArgs<'window<-minimize'>) {
// 		return ipcApi.invoke('window<-minimize', ...args);
// 	},
// 	//
// 	openDownloadDirPicker(...args: IpcArgs<'main<-pick-download-dir'>): Promise<IpcReturn<'main<-pick-download-dir'>> {
// 		return ipcApi.invoke('main<-pick-download-dir', ...args);
// 	},
// 	openDownloadDir(...args: IpcArgs<'main<-open-download-dir'>) {
// 		return ipcApi.invoke('main<-open-download-dir', ...args);
// 	},
// 	openCookiesFilePicker(...args: IpcArgs<'main<-pick-cookies-file'>) {
// 		return ipcApi.invoke('main<-pick-cookies-file', ...args);
// 	},
// 	toggleWindowPinned() {
// 		return ipcRenderer.invoke(IpcChannel.Main_ToggleWindowPinned);
// 	},
// 	openLogFile() {
// 		return ipcRenderer.invoke(IpcChannel.Main_OpenLogFile);
// 	},
// 	openAppData() {
// 		return ipcRenderer.invoke(IpcChannel.Main_OpenAppData);
// 	},
// 	//
// 	cancelSetup() {
// 		return ipcRenderer.invoke(IpcChannel.Setup_Cancel);
// 	},
// 	//
// 	getSettingsValue(key: SettingsKey, defaultValue?: any, secure: boolean = false) {
// 		return ipcRenderer.invoke(IpcChannel.Settings_Get, key, defaultValue, secure);
// 	},
// 	setSettingsValue(key: SettingsKey, value: any, secure: boolean = false) {
// 		return ipcRenderer.invoke(IpcChannel.Settings_Set, key, value, secure);
// 	},
// 	resetSettings() {
// 		return ipcRenderer.invoke(IpcChannel.Settings_Reset);
// 	},
// 	showSettingsUI() {
// 		return ipcRenderer.invoke(IpcChannel.Settings_ShowUi);
// 	},
// 	//
// 	downloadVideo(url: string) {
// 		return ipcRenderer.invoke(IpcChannel.Ytdlp_DownloadVideo, url);
// 	},
// 	downloadAudio(url: string) {
// 		return ipcRenderer.invoke(IpcChannel.Ytdlp_DownloadAudio, url);
// 	},
// 	downloadDefault(url: string) {
// 		return ipcRenderer.invoke(IpcChannel.Ytdlp_DownloadDefault, url);
// 	},
// 	removeCookiesFile() {
// 		return ipcRenderer.invoke(IpcChannel.Ytdlp_RemoveCookiesFile);
// 	},
// 	cancelDownload() {
// 		return ipcRenderer.invoke(IpcChannel.Ytdlp_CancelDownload);
// 	},
// 	recheckBinaries() {
// 		return ipcRenderer.invoke(IpcChannel.Ytdlp_RecheckBinaries);
// 	},
// 	updateYtdlpBinary() {
// 		return ipcRenderer.invoke(IpcChannel.Ytdlp_UpdateBinary);
// 	},
// 	//
// 	enableAutoStart() {
// 		return ipcRenderer.invoke(IpcChannel.Autostart_Enable);
// 	},
// 	disableAutoStart() {
// 		return ipcRenderer.invoke(IpcChannel.Autostart_Disable);
// 	},
// 	toggleAutoStart() {
// 		return ipcRenderer.invoke(IpcChannel.Autostart_Toggle);
// 	},
// 	//
// 	enableGlobalMenu() {
// 		return ipcRenderer.invoke(IpcChannel.GlobalMenu_Enable);
// 	},
// 	disableGlobalMenu() {
// 		return ipcRenderer.invoke(IpcChannel.GlobalMenu_Disable);
// 	},
// 	toggleGlobalMenu() {
// 		return ipcRenderer.invoke(IpcChannel.GlobalMenu_Toggle);
// 	},
// 	//
// 	showUpdaterWindow() {
// 		return ipcRenderer.invoke(IpcChannel.Updater_ShowWindow);
// 	},
// 	getLatestRelease() {
// 		return ipcRenderer.invoke(IpcChannel.Updater_GetLatestRelease);
// 	},
// 	getLatestChangelog() {
// 		return ipcRenderer.invoke(IpcChannel.Updater_GetLatestChangelog);
// 	},
// 	getCommitsSinceBuild() {
// 		return ipcRenderer.invoke(IpcChannel.Updater_GetCommitsSinceBuild);
// 	},
// 	checkForUpdates() {
// 		return ipcRenderer.invoke(IpcChannel.Updater_CheckForUpdates, true);
// 	},
// 	startUpdate() {
// 		return ipcRenderer.invoke(IpcChannel.Updater_Update);
// 	},
// 	cancelUpdate() {
// 		return ipcRenderer.invoke(IpcChannel.Updater_Cancel);
// 	},
// } satisfies CoreApi;

const systemApi = { arch, type, release, platform, hostname } satisfies SystemApi;

const settingsApi = {
	getValue(key, defaultValue, secure) {
		return ipcApi.sendSync('settings<-get', key, defaultValue, secure);
	},
} satisfies SettingsApi;

const featureFlagsApi = {
	getFeatureFlags() {
		return ipcApi.sendSync('feature-flag<-get-feature-flags');
	},
} satisfies FeatureFlagsApi;

contextBridge.exposeInMainWorld('versions', versionsApi);
contextBridge.exposeInMainWorld('buildDate', new Date(__BUILD_DATE__));
contextBridge.exposeInMainWorld('ipc', ipcApi);
// contextBridge.exposeInMainWorld('api', coreApi);
contextBridge.exposeInMainWorld('system', systemApi);
contextBridge.exposeInMainWorld('settings', settingsApi);
contextBridge.exposeInMainWorld('featureFlags', featureFlagsApi);
