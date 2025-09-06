import { ipcMain } from 'electron';
import { injectable } from '@needle-di/core';
import { IpcChannels, type IIpcContract } from 'shared';
import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron';

type Handler<K extends keyof IIpcContract> = (event: IpcMainInvokeEvent, ...args: IIpcContract[K]['args']) => IIpcContract[K]['return'] | Promise<IIpcContract[K]['return']>;
type SyncHandler<K extends keyof IIpcContract> = (event: IpcMainEvent, ...args: IIpcContract[K]['args']) => void;

@injectable()
export class IpcService {
	public registerHandler<K extends keyof IIpcContract>(channel: K, handler: Handler<K>) {
		this.assertValidIpcChannel(channel);
		ipcMain.handle(channel, handler);
	}

	public registerSyncHandler<K extends keyof IIpcContract>(channel: K, handler: SyncHandler<K>) {
		this.assertValidIpcChannel(channel);
		ipcMain.on(channel, handler);
	}

	public registerOnceHandler<K extends keyof IIpcContract>(channel: K, handler: Handler<K>) {
		this.assertValidIpcChannel(channel);
		ipcMain.handleOnce(channel, handler);
	}

	public registerOnceSyncHandler<K extends keyof IIpcContract>(channel: K, handler: SyncHandler<K>) {
		this.assertValidIpcChannel(channel);
		ipcMain.once(channel, handler);
	}

	public removeHandlers<K extends keyof IIpcContract>(channel: K) {
		this.assertValidIpcChannel(channel);
		ipcMain.removeHandler(channel);
	}

	public channelHasHandlers<K extends keyof IIpcContract>(channel: K) {
		this.assertValidIpcChannel(channel);
		return this.getHandlerCount(channel) > 0;
	}

	public getHandlerCount<K extends keyof IIpcContract>(channel: K) {
		this.assertValidIpcChannel(channel);
		return ipcMain.listenerCount(channel);
	}

	private assertValidIpcChannel(channel: keyof IIpcContract): void | never {
		if (!IpcChannels.includes(channel)) {
			throw new Error(`Invalid IPC channel "${channel}"`);
		}
	}
}
