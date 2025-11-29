import { useRef, useEffect } from 'react';
import type { Nullable, IIpcEvents } from 'shared';

type Listener<K extends keyof IIpcEvents> = (payload: IIpcEvents[K]) => void;
type ListenerRemover                      = Nullable<() => void>;

export const useIpc = <K extends keyof IIpcEvents>(channel: K) => {
	const listenerRemovers = useRef<ListenerRemover[]>([]);

	const on = (listener: Listener<K>) => {
		const removeListener = window.ipc.on(channel, listener);

		listenerRemovers.current.push(removeListener);

		return removeListener;
	};

	const once = (listener: Listener<K>) => {
		return window.ipc.once(channel, listener);
	};

	const off = (listener: Listener<K>) => {
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
