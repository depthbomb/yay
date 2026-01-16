import { cast, typedEntries } from '@depthbomb/common';
import type { IIPCEvents, IPCChannel, IIPCContract } from '.';
import type { Maybe, assume, Nullable, Awaitable } from '@depthbomb/common';

export { cast, Maybe, assume, Nullable, Awaitable, typedEntries };

export type VersionsApi = typeof process.versions;

export type IpcApi = {
	invoke<K extends keyof IIPCContract>(channel: K, ...args: IIPCContract[K]['args']): Promise<IIPCContract[K]['return']>;
	sendSync<K extends keyof IIPCContract>(channel: K, ...args: IIPCContract[K]['args']): Nullable<IIPCContract[K]['return']>;
	on<K extends keyof IIPCEvents>(channel: K, listener: (payload: IIPCEvents[K]) => void): () => void;
	once<K extends keyof IIPCEvents>(channel: K, listener: (payload: IIPCEvents[K]) => void): void;
	off<K extends keyof IIPCEvents>(channel: K, listener: (payload: IIPCEvents[K]) => void): void;
	removeAllListeners: (channel: IPCChannel) => void;
};

export type SystemApi = {
	arch: () => string;
	type: () => string;
	release: () => string;
	platform: () => NodeJS.Platform;
	hostname: () => string;
};

export type SettingsApi = {
	getValue(...args: IIPCContract['settings<-get']['args']): Nullable<IIPCContract['settings<-get']['return']>;
};

export type FeatureFlagsApi = {
	getFeatureFlags(...args: IIPCContract['feature-flag<-get-feature-flags']['args']): IIPCContract['feature-flag<-get-feature-flags']['return'];
};
