import { ipcRenderer, contextBridge } from 'electron';
import { IPCEvents, IPCChannel, IPCChannels } from 'shared';
import { arch, type, release, platform, hostname } from 'node:os';
import type { IPCAPI, IIPCEvents, IIPCContract, SystemAPI, VersionsAPI, SettingsAPI, FeatureFlagsAPI } from 'shared';

type IPCArgs<K extends keyof IIPCContract>   = IIPCContract[K]['args'];
type IPCReturn<K extends keyof IIPCContract> = IIPCContract[K]['return'];

function assertChannelValid<K extends string>(channel: K, set: Set<K>) {
	if (!set.has(channel)) {
		const msg = `Invalid IPC channel: ${channel}`;

		if (__STRICT__) {
			throw new Error(msg);
		}

		console.error(msg);

		return false;
	}

	return true;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
const listenerMap = new WeakMap<Function, (event: Electron.IpcRendererEvent, payload: any) => void>();

const versionsAPI = Object.freeze({ ...process.versions }) satisfies VersionsAPI;

const ipcAPI = Object.freeze({
	invoke<K extends keyof IIPCContract>(channel: K, ...args: IPCArgs<K>){
		if (!assertChannelValid(channel, IPCChannels)) {
			return Promise.reject(new Error(`Invalid channel: ${channel}`));
		}

		return ipcRenderer.invoke(channel, ...args) as Promise<IPCReturn<K>>;
	},
	sendSync<K extends keyof IIPCContract>(channel: K, ...args: IPCArgs<K>){
		if (!assertChannelValid(channel, IPCChannels)) {
			return null;
		}

		return ipcRenderer.sendSync(channel, ...args) as IPCReturn<K>;
	},
	on<K extends keyof IIPCEvents>(channel: K, listener: (payload: IIPCEvents[K]) => void) {
		if (!assertChannelValid(channel, IPCEvents)) {
			return () => {};
		}

		const wrapped = (_: Electron.IpcRendererEvent, payload: IIPCEvents[K]) => listener(payload);

		listenerMap.set(listener, wrapped);
		ipcRenderer.on(channel, wrapped);

		return () => this.off(channel, listener);
	},
	once<K extends keyof IIPCEvents>(channel: K, listener: (payload: IIPCEvents[K]) => void) {
		if (!assertChannelValid(channel, IPCEvents)) {
			return;
		}

		const wrapped = (_: Electron.IpcRendererEvent, payload: IIPCEvents[K]) => listener(payload);

		ipcRenderer.once(channel, wrapped);
	},
	off<K extends keyof IIPCEvents>(channel: K, listener: (payload: IIPCEvents[K]) => void) {
		if (!assertChannelValid(channel, IPCEvents)) {
			return;
		}

		const wrapped = listenerMap.get(listener);
		if (wrapped) {
			ipcRenderer.removeListener(channel, wrapped);
			listenerMap.delete(listener);
		}
	},
	removeAllListeners (channel: IPCChannel) {
		if (!assertChannelValid(channel, IPCChannels)) {
			return;
		}

		ipcRenderer.removeAllListeners(channel);
	}
}) satisfies IPCAPI;

const systemAPI = Object.freeze({ arch, type, release, platform, hostname }) satisfies SystemAPI;

const settingsAPI = Object.freeze({
	getValue(key, defaultValue, secure) {
		return ipcAPI.sendSync('settings<-get', key, defaultValue, secure);
	},
}) satisfies SettingsAPI;

const featureFlagsAPI = Object.freeze({
	getFeatureFlags() {
		return ipcAPI.sendSync('feature-flag<-get-feature-flags')!;
	},
}) satisfies FeatureFlagsAPI;

contextBridge.exposeInMainWorld('versions', versionsAPI);
contextBridge.exposeInMainWorld('buildDate', new Date(__BUILD_DATE__));
contextBridge.exposeInMainWorld('ipc', ipcAPI);
contextBridge.exposeInMainWorld('system', systemAPI);
contextBridge.exposeInMainWorld('settings', settingsAPI);
contextBridge.exposeInMainWorld('featureFlags', featureFlagsAPI);
