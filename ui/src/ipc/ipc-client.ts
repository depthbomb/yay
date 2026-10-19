import type { IIPCEvents, IIPCContract } from './ipc.generated';

type Listener = (payload: never) => void;
type ResolveRequest = (value: unknown) => void;

export type IpcClient = Readonly<{
	invoke<K extends keyof IIPCContract>(channel: K, ...args: IIPCContract[K]['args']): Promise<IIPCContract[K]['return']>;
	on<K extends keyof IIPCEvents>(channel: K, listener: (payload: IIPCEvents[K]) => void): () => void;
	once<K extends keyof IIPCEvents>(channel: K, listener: (payload: IIPCEvents[K]) => void): void;
	off<K extends keyof IIPCEvents>(channel: K, listener: (payload: IIPCEvents[K]) => void): void;
	removeAllListeners(channel: keyof IIPCEvents): void;
}>;

export interface IpcTransport {
	postMessage(message: unknown): void;
	addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
}

export function createIpcClient(transport: IpcTransport): IpcClient {
	const pending = new Map<number, ResolveRequest>();
	const listeners = new Map<string, Set<Listener>>();
	let nextId = 0;

	function invoke<K extends keyof IIPCContract>(channel: K, ...args: IIPCContract[K]['args']): Promise<IIPCContract[K]['return']> {
		return new Promise(resolve => {
			const id = ++nextId;
			pending.set(id, resolve as ResolveRequest);
			try {
				transport.postMessage({
					id,
					channel,
					args,
				});
			}
			catch (error) {
				pending.delete(id);
				throw error;
			}
		});
	}

	function on<K extends keyof IIPCEvents>(channel: K, listener: (payload: IIPCEvents[K]) => void) {
		let entries = listeners.get(channel);
		if (!entries) {
			entries = new Set();
			listeners.set(channel, entries);
		}

		entries.add(listener as Listener);
		return () => {
			entries.delete(listener as Listener);
		};
	}

	transport.addEventListener('message', event => {
		const message = event.data;
		if (typeof message?.id === 'number') {
			const resolve = pending.get(message.id);
			pending.delete(message.id);
			resolve?.(message.result);
		}
		else if (typeof message?.channel === 'string') {
			// Snapshot the listeners so subscription changes apply to the next event.
			for (const listener of [...(listeners.get(message.channel) ?? [])]) {
				listener(message.payload as never);
			}
		}
	});

	return Object.freeze({
		invoke,
		on,
		off(channel, listener) {
			listeners.get(channel)?.delete(listener as Listener);
		},
		once(channel, listener) {
			const remove = on(channel, payload => {
				remove();
				listener(payload);
			});
		},
		removeAllListeners(channel) {
			listeners.delete(channel);
		},
	} satisfies IpcClient);
}
