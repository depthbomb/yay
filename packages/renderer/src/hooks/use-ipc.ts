import { useRef, useEffect, useCallback } from 'react';
import type { IIPCEvents } from 'shared';

type Listener<K extends keyof IIPCEvents> = (payload: IIPCEvents[K]) => void;

export const useIpc = <K extends keyof IIPCEvents>(channel: K) => {
	const listenerRemovers = useRef<Set<() => void>>(new Set());

	const on = useCallback((listener: Listener<K>) => {
		const remove = window.ipc.on(channel, listener);
		listenerRemovers.current.add(remove);

		return () => {
			remove();
			listenerRemovers.current.delete(remove);
		};
	}, [channel]);

	const once = useCallback((listener: Listener<K>) => {
		return window.ipc.once(channel, listener);
	}, [channel]);

	const off = useCallback((listener: Listener<K>) => {
		return window.ipc.off(channel, listener);
	}, [channel]);

	useEffect(() => {
		const removers = listenerRemovers.current;
		return () => {
			for (const remove of removers) {
				remove();
			}

			removers.clear();
		};
	}, []);

	return [on, once, off] as const;
};
