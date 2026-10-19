import { native } from '~/native';
import { useEffect, useEffectEvent } from 'react';
import type { IIPCEvents } from '~/ipc/ipc.generated';

type Listener<K extends keyof IIPCEvents> = (payload: IIPCEvents[K]) => void;

export const useIPCEvent = <K extends keyof IIPCEvents>(channel: K, listener: Listener<K>) => {
	const stable = useEffectEvent(listener);
	useEffect(() => native.ipc.on(channel, stable), [channel]);
};
