import { useRef, useEffect } from 'react';
import type { Nullable, IpcChannel } from 'shared';

type IpcListener = (...args: any[]) => unknown;
type ListenerRemover = Nullable<() => void>;

export const useIpc = (channel: IpcChannel) => {
	const listenerRemovers = useRef<ListenerRemover[]>([]);

	const on = (listener: IpcListener) => {
		const removeListener = window.ipc.on(channel, listener);

		listenerRemovers.current.push(removeListener);

		return removeListener;
	};

	const once = (listener: IpcListener) => {
		return window.ipc.once(channel, listener);
	};

	const off = (listener: IpcListener) => {
		return window.ipc.off(channel, listener);
	};

	useEffect(() => {
		return () => {
			for (const removeListener of listenerRemovers.current) {
				removeListener?.();
			}

			listenerRemovers.current = [];
		}
	}, []);

	return [on, once, off] as const;
};
