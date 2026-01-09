import { atom } from 'jotai';
import { RESET, atomWithReset } from 'jotai/utils';

export const MAX_LOG_HISTORY_LENGTH = 250 as const;

export const logAtom = atomWithReset<string[]>([]);

export const shiftLogAtom = atom(null, (get, set) => {
	const current = get(logAtom).slice(1);
	set(logAtom, [...current]);
});

export const pushToLogAtom = atom<null, [newItem: string], void>(null, (get, set, newItem) => {
	const current = get(logAtom);
	const next    = [...current, newItem];
	if (next.length > MAX_LOG_HISTORY_LENGTH) {
		next.shift();
	}

	set(logAtom, [...current, newItem]);
});

export const clearLogAtom = atom(null, (_get, set) => set(logAtom, RESET));
