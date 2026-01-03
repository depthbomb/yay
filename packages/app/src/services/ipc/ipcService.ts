import { ipcMain } from 'electron';
import { IPCChannels } from 'shared';
import { injectable } from '@needle-di/core';
import type { IIPCContract } from 'shared';
import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron';

type Handler<K extends keyof IIPCContract> = (event: IpcMainInvokeEvent, ...args: IIPCContract[K]['args']) => IIPCContract[K]['return'] | Promise<IIPCContract[K]['return']>;
type SyncHandler<K extends keyof IIPCContract> = (event: IpcMainEvent, ...args: IIPCContract[K]['args']) => void;

@injectable()
export class IPCService {
	public registerHandler<K extends keyof IIPCContract>(channel: K, handler: Handler<K>) {
		this.assertValidIpcChannel(channel);
		ipcMain.handle(channel, handler);
	}

	public registerSyncHandler<K extends keyof IIPCContract>(channel: K, handler: SyncHandler<K>) {
		this.assertValidIpcChannel(channel);
		ipcMain.on(channel, handler);
	}

	public registerOnceHandler<K extends keyof IIPCContract>(channel: K, handler: Handler<K>) {
		this.assertValidIpcChannel(channel);
		ipcMain.handleOnce(channel, handler);
	}

	public registerOnceSyncHandler<K extends keyof IIPCContract>(channel: K, handler: SyncHandler<K>) {
		this.assertValidIpcChannel(channel);
		ipcMain.once(channel, handler);
	}

	public removeHandlers<K extends keyof IIPCContract>(channel: K) {
		this.assertValidIpcChannel(channel);
		ipcMain.removeHandler(channel);
	}

	public channelHasHandlers<K extends keyof IIPCContract>(channel: K) {
		this.assertValidIpcChannel(channel);
		return this.getHandlerCount(channel) > 0;
	}

	public getHandlerCount<K extends keyof IIPCContract>(channel: K) {
		this.assertValidIpcChannel(channel);
		return ipcMain.listenerCount(channel);
	}

	private assertValidIpcChannel(channel: keyof IIPCContract): void | never {
		if (!IPCChannels.includes(channel)) {
			throw new Error(`Invalid IPC channel "${channel}"`);
		}
	}
}
