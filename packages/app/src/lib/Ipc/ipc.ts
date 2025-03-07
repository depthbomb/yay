import { ipcMain } from 'electron';
import { IpcChannel, IpcChannels } from 'shared';
import type { WindowManager } from '~/lib/WindowManager';
import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron';

type HandlerFunction     = (event: IpcMainInvokeEvent, ...args: any[]) => unknown;
type SyncHandlerFunction = (event: IpcMainEvent, ...args: any[]) => unknown;

export class Ipc {
	public constructor(
		private readonly windowManager: WindowManager
	) {}

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

	public emitToWindow(name: string, channel: IpcChannel, ...args: unknown[]) {
		this.assertValidIpcChannel(channel);

		this.windowManager.emit(name, channel, ...args);
	}

	public emitToMainWindow(channel: IpcChannel, ...args: unknown[]) {
		this.assertValidIpcChannel(channel);

		this.windowManager.emitMain(channel, ...args);
	}

	public emitToAllWindows(channel: IpcChannel, ...args: unknown[]) {
		this.assertValidIpcChannel(channel);

		this.windowManager.emitAll(channel, ...args);
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
