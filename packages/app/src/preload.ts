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

const systemApi = { arch, type, release, platform, hostname } satisfies SystemApi;

const settingsApi = {
	getValue(key, defaultValue, secure) {
		return ipcApi.sendSync('settings<-get', key, defaultValue, secure);
	},
} satisfies SettingsApi;

const featureFlagsApi = {
	getFeatureFlags() {
		return ipcApi.sendSync('feature-flag<-get-feature-flags')!;
	},
} satisfies FeatureFlagsApi;

contextBridge.exposeInMainWorld('versions', versionsApi);
contextBridge.exposeInMainWorld('buildDate', new Date(__BUILD_DATE__));
contextBridge.exposeInMainWorld('ipc', ipcApi);
contextBridge.exposeInMainWorld('system', systemApi);
contextBridge.exposeInMainWorld('settings', settingsApi);
contextBridge.exposeInMainWorld('featureFlags', featureFlagsApi);
