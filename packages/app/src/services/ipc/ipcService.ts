import { ipcMain } from 'electron';
import { DEV_PORT, IPCChannels } from 'shared';
import { injectable } from '@needle-di/core';
import { fileURLToPath } from 'node:url';
import { join, normalize } from 'node:path';
import { ROOT_PATH } from '~/constants';
import type { IIPCContract } from 'shared';
import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron';

type Handler<K extends keyof IIPCContract> = (event: IpcMainInvokeEvent, ...args: IIPCContract[K]['args']) => IIPCContract[K]['return'] | Promise<IIPCContract[K]['return']>;
type SyncHandler<K extends keyof IIPCContract> = (event: IpcMainEvent, ...args: IIPCContract[K]['args']) => void;

@injectable()
export class IPCService {
	public registerHandler<K extends keyof IIPCContract>(channel: K, handler: Handler<K>) {
		this.assertValidIpcChannel(channel);
		ipcMain.handle(channel, (event, ...args) => {
			this.assertTrustedSender(event);
			return handler(event, ...args as IIPCContract[K]['args']);
		});
	}

	public registerSyncHandler<K extends keyof IIPCContract>(channel: K, handler: SyncHandler<K>) {
		this.assertValidIpcChannel(channel);
		ipcMain.on(channel, (event, ...args) => {
			this.assertTrustedSender(event);
			handler(event, ...args as IIPCContract[K]['args']);
		});
	}

	public registerOnceHandler<K extends keyof IIPCContract>(channel: K, handler: Handler<K>) {
		this.assertValidIpcChannel(channel);
		ipcMain.handleOnce(channel, (event, ...args) => {
			this.assertTrustedSender(event);
			return handler(event, ...args as IIPCContract[K]['args']);
		});
	}

	public registerOnceSyncHandler<K extends keyof IIPCContract>(channel: K, handler: SyncHandler<K>) {
		this.assertValidIpcChannel(channel);
		ipcMain.once(channel, (event, ...args) => {
			this.assertTrustedSender(event);
			handler(event, ...args as IIPCContract[K]['args']);
		});
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
		if (!IPCChannels.has(channel)) {
			throw new Error(`Invalid IPC channel "${channel}"`);
		}
	}

	private assertTrustedSender(event: IpcMainEvent | IpcMainInvokeEvent) {
		if (event.senderFrame !== event.sender.mainFrame) {
			throw new Error('IPC messages from subframes are not allowed');
		}

		const frameURL = new URL(event.senderFrame.url);
		if (import.meta.env.DEV) {
			const isLoopback = frameURL.hostname === 'localhost' || frameURL.hostname === '127.0.0.1';
			if (frameURL.protocol === 'http:' && isLoopback && frameURL.port === String(DEV_PORT) && frameURL.pathname === '/renderer.html') {
				return;
			}
		} else if (frameURL.protocol === 'file:') {
			const senderPath   = normalize(fileURLToPath(frameURL));
			const rendererPath = normalize(join(ROOT_PATH, 'renderer.html'));
			if (senderPath === rendererPath) {
				return;
			}
		}

		throw new Error(`IPC message from untrusted sender: ${frameURL.origin}`);
	}
}
