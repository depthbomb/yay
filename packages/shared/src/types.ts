import type { IIpcEvents, IIpcContract, IpcChannel } from '.';
import type { Maybe, Nullable, Awaitable } from '@depthbomb/node-common';

export { Maybe, Nullable, Awaitable };

export type VersionsApi = typeof process.versions;

export type IpcApi = {
	invoke<K extends keyof IIpcContract>(channel: K, ...args: IIpcContract[K]['args']): Promise<IIpcContract[K]['return']>;
	sendSync<K extends keyof IIpcContract>(channel: K, ...args: IIpcContract[K]['args']): Nullable<IIpcContract[K]['return']>;
	on<K extends keyof IIpcEvents>(channel: K, listener: (payload: IIpcEvents[K]) => void): () => void;
	once<K extends keyof IIpcEvents>(channel: K, listener: (payload: IIpcEvents[K]) => void): void;
	off<K extends keyof IIpcEvents>(channel: K, listener: (payload: IIpcEvents[K]) => void): void;
	removeAllListeners: (channel: IpcChannel) => void;
};

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

export function cast<T>(value: unknown) {
	return value as T;
}
