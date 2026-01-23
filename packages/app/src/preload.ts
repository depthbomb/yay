import { ipcRenderer, contextBridge } from 'electron';
import { IPCEvents, IPCChannel, IPCChannels } from 'shared';
import { arch, type, release, platform, hostname } from 'node:os';
import type { IPCAPI, IIPCEvents, IIPCContract, SystemAPI, VersionsAPI, SettingsAPI, FeatureFlagsAPI } from 'shared';

type IPCArgs<K extends keyof IIPCContract>   = IIPCContract[K]['args'];
type IPCReturn<K extends keyof IIPCContract> = IIPCContract[K]['return'];

const versionsAPI = process.versions satisfies VersionsAPI;

const ipcAPI = {
	invoke<K extends keyof IIPCContract>(channel: K, ...args: IPCArgs<K>){
		if (!IPCChannels.includes(channel)) {
			if (__STRICT__) {
				throw new Error(`Attempted to invoke invalid channel: ${channel}`);
			}

			console.error('Attempted to invoke invalid channel', { channel, args });

			return Promise.reject(new Error(`Invalid channel: ${channel}`));
		}

		return ipcRenderer.invoke(channel, ...args) as Promise<IPCReturn<K>>;
	},
	sendSync<K extends keyof IIPCContract>(channel: K, ...args: IPCArgs<K>){
		if (!IPCChannels.includes(channel)) {
			if (__STRICT__) {
				throw new Error(`Attempted to invoke invalid channel: ${channel}`);
			}

			console.error('Attempted to invoke invalid channel', { channel, args });

			return null;
		}

		return ipcRenderer.sendSync(channel, ...args) as IPCReturn<K>;
	},
	on<K extends keyof IIPCEvents>(channel: K, listener: (payload: IIPCEvents[K]) => void) {
		if (!IPCEvents.includes(channel)) {
			if (__STRICT__) {
				throw new Error(`Attempted to listen to invalid channel: ${channel}`);
			}

			console.error('Attempted to listen to invalid channel', { channel });

			return () => {};
		}

		const wrapped = (_: Electron.IpcRendererEvent, payload: IIPCEvents[K]) => listener(payload);

		ipcRenderer.on(channel, wrapped);

		return () => ipcRenderer.removeListener(channel, wrapped);
	},
	once<K extends keyof IIPCEvents>(channel: K, listener: (payload: IIPCEvents[K]) => void) {
		if (!IPCEvents.includes(channel)) {
			if (__STRICT__) {
				throw new Error(`Attempted to listen to invalid channel: ${channel}`);
			}

			console.error('Attempted to listen to invalid channel', { channel });
			return;
		}

		const wrapped = (_: Electron.IpcRendererEvent, payload: IIPCEvents[K]) => listener(payload);

		ipcRenderer.once(channel, wrapped);
	},
	off<K extends keyof IIPCEvents>(channel: K, listener: (payload: IIPCEvents[K]) => void) {
		if (!IPCEvents.includes(channel)) {
			if (__STRICT__) {
				throw new Error(`Attempted to remove listener from invalid channel: ${channel}`);
			}

			console.error('Attempted to remove listener from invalid channel', { channel });
			return;
		}

		const wrapped = (_: Electron.IpcRendererEvent, payload: IIPCEvents[K]) => listener(payload);

		ipcRenderer.removeListener(channel, wrapped);
	},
	removeAllListeners (channel: IPCChannel) {
		if (!IPCChannels.includes(channel)) {
			if (__STRICT__) {
				throw new Error(`Attempted to remove listeners from invalid channel: ${channel}`);
			}

			console.error('Attempted to remove listeners from invalid channel', { channel });
			return;
		}

		ipcRenderer.removeAllListeners(channel);
	}
} satisfies IPCAPI;

const systemAPI = { arch, type, release, platform, hostname } satisfies SystemAPI;

const settingsAPI = {
	getValue(key, defaultValue, secure) {
		return ipcAPI.sendSync('settings<-get', key, defaultValue, secure);
	},
} satisfies SettingsAPI;

const featureFlagsAPI = {
	getFeatureFlags() {
		return ipcAPI.sendSync('feature-flag<-get-feature-flags')!;
	},
} satisfies FeatureFlagsAPI;

contextBridge.exposeInMainWorld('versions', versionsAPI);
contextBridge.exposeInMainWorld('buildDate', new Date(__BUILD_DATE__));
contextBridge.exposeInMainWorld('ipc', ipcAPI);
contextBridge.exposeInMainWorld('system', systemAPI);
contextBridge.exposeInMainWorld('settings', settingsAPI);
contextBridge.exposeInMainWorld('featureFlags', featureFlagsAPI);
