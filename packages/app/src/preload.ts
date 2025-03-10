import { ipcRenderer, contextBridge } from 'electron';
import { IpcChannel, IpcChannels, SettingsKey } from 'shared';
import { arch, type, release, platform, hostname } from 'node:os';
import type { IpcRendererEvent, MessageBoxOptions } from 'electron';

function on(channel: IpcChannel, listener: (...args: any[]) => void) {
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
}

function once(channel: IpcChannel, listener: (...args: any[]) => void) {
	if (!IpcChannels.includes(channel)) {
		if (__STRICT__) {
			throw new Error(`Attempted to listen to invalid channel: ${channel}`);
		}

		console.error('Attempted to listen to invalid channel', { channel });
		return;
	}

	ipcRenderer.once(channel, (_, ...args) => listener(...args));
}

function off (channel: IpcChannel, listener: (...args: any[]) => void) {
	if (!IpcChannels.includes(channel)) {
		if (__STRICT__) {
			throw new Error(`Attempted to remove listener from invalid channel: ${channel}`);
		}

		console.error('Attempted to remove listener from invalid channel', { channel });
		return;
	}

	ipcRenderer.removeListener(channel, listener);
}

function removeAllListeners (channel: IpcChannel) {
	if (!IpcChannels.includes(channel)) {
		if (__STRICT__) {
			throw new Error(`Attempted to remove listeners from invalid channel: ${channel}`);
		}

		console.error('Attempted to remove listeners from invalid channel', { channel });
		return;
	}

	ipcRenderer.removeAllListeners(channel);
}

contextBridge.exposeInMainWorld('versions', process.versions);
contextBridge.exposeInMainWorld('buildDate', new Date(__BUILD_DATE__));
contextBridge.exposeInMainWorld('ipc', { on, once, off, removeAllListeners });
contextBridge.exposeInMainWorld('api', {
	minimizeWindow(windowName: string) {
		return ipcRenderer.invoke(IpcChannel.MinimizeWindow, windowName);
	},
	playNotificationSound() {
		return ipcRenderer.invoke(IpcChannel.PlayNotificationSound);
	},
	showInputRightClickMenu() {
		return ipcRenderer.invoke(IpcChannel.ShowInputRightClickMenu);
	},
	openDownloadDir() {
		return ipcRenderer.invoke(IpcChannel.OpenDownloadDir);
	},
	openDownloadDirPicker() {
		return ipcRenderer.invoke(IpcChannel.OpenDownloadDirPicker);
	},
	toggleWindowPinned() {
		return ipcRenderer.invoke(IpcChannel.ToggleWindowPinned);
	},
	showMessageBox(options: MessageBoxOptions) {
		return ipcRenderer.invoke(IpcChannel.ShowMessageBox, options);
	},
	//
	cancelSetup() {
		return ipcRenderer.invoke(IpcChannel.CancelSetup);
	},
	//
	getSettingsValue(key: SettingsKey, defaultValue?: any, secure: boolean = false) {
		return ipcRenderer.invoke(IpcChannel.GetSettingsValue, key, defaultValue, secure);
	},
	setSettingsValue(key: SettingsKey, value: any, secure: boolean = false) {
		return ipcRenderer.invoke(IpcChannel.SetSettingsValue, key, value, secure);
	},
	resetSettings() {
		return ipcRenderer.invoke(IpcChannel.ResetSettings);
	},
	//
	downloadVideo(url: string) {
		return ipcRenderer.invoke(IpcChannel.DownloadVideo, url);
	},
	downloadAudio(url: string) {
		return ipcRenderer.invoke(IpcChannel.DownloadAudio, url);
	},
	downloadDefault(url: string) {
		return ipcRenderer.invoke(IpcChannel.DownloadAudio, url);
	},
	cancelDownload() {
		return ipcRenderer.invoke(IpcChannel.CancelDownload);
	},
	recheckBinaries() {
		return ipcRenderer.invoke(IpcChannel.RecheckBinaries);
	},
	checkForYtdlpUpdate() {
		return ipcRenderer.invoke(IpcChannel.CheckForYtdlpUpdate);
	},
	updateYtdlpBinary() {
		return ipcRenderer.invoke(IpcChannel.UpdateYtdlpBinary);
	},
	//
	getAutoStart() {
		return ipcRenderer.invoke(IpcChannel.GetAutoStart);
	},
	enableAutoStart() {
		return ipcRenderer.invoke(IpcChannel.EnableAutoStart);
	},
	disableAutoStart() {
		return ipcRenderer.invoke(IpcChannel.DisableAutoStart);
	},
	toggleAutoStart() {
		return ipcRenderer.invoke(IpcChannel.ToggleAutostart);
	},
	//
	getGlobalMenuEnabled() {
		return ipcRenderer.invoke(IpcChannel.GetGlobalMenuEnabled);
	},
	enableGlobalMenu() {
		return ipcRenderer.invoke(IpcChannel.EnableGlobalMenu);
	},
	disableGlobalMenu() {
		return ipcRenderer.invoke(IpcChannel.DisableGlobalMenu);
	},
	toggleGlobalMenu() {
		return ipcRenderer.invoke(IpcChannel.ToggleGlobalMenu);
	},
});
contextBridge.exposeInMainWorld('system', { arch, type, release, platform, hostname });
contextBridge.exposeInMainWorld('settings', {
	getValue: (key: string, defaultValue?: unknown, secure?: boolean) => ipcRenderer.sendSync(IpcChannel.GetSettingsValue, key, defaultValue, secure)
});
