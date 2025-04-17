import { ipcMain } from 'electron';
import { injectable } from '@needle-di/core';
import { IpcChannel, IpcChannels } from 'shared';
import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron';

type HandlerFunction     = (event: IpcMainInvokeEvent, ...args: any[]) => unknown;
type SyncHandlerFunction = (event: IpcMainEvent, ...args: any[]) => unknown;

@injectable()
export class IpcService {
	public registerHandler(channel: IpcChannel, handler: HandlerFunction): void {
		this.assertValidIpcChannel(channel);

		ipcMain.handle(channel, handler);
	}

	public registerSyncHandler(channel: IpcChannel, handler: SyncHandlerFunction): void {
		this.assertValidIpcChannel(channel);

		ipcMain.on(channel, handler);
	}

	public registerOnceHandler(channel: IpcChannel, handler: HandlerFunction): void {
		this.assertValidIpcChannel(channel);

		ipcMain.handleOnce(channel, handler);
	}

	public registerOnceSyncHandler(channel: IpcChannel, handler: SyncHandlerFunction): void {
		this.assertValidIpcChannel(channel);

		ipcMain.once(channel, handler);
	}

	public removeHandlers(channel: IpcChannel): void {
		this.assertValidIpcChannel(channel);

		ipcMain.removeHandler(channel);
	}

	public channelHasHandlers(channel: IpcChannel): boolean {
		this.assertValidIpcChannel(channel);

		return this.getHandlerCount(channel) > 0;
	}

	public getHandlerCount(channel: IpcChannel): number {
		this.assertValidIpcChannel(channel);

		return ipcMain.listenerCount(channel);
	}

	private assertValidIpcChannel(channel: IpcChannel): void | never {
		if (!IpcChannels.includes(channel)) {
			throw new Error(`Invalid IPC channel "${channel}"`);
		}
	}
}
