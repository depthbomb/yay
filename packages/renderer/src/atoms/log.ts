import { atom } from 'jotai';
import { RESET, atomWithReset } from 'jotai/utils';

export const logAtom = atomWithReset<string[]>([]);

export const shiftLogAtom = atom(null, (get, set) => {
	const current = get(logAtom).slice(1);
	set(logAtom, [...current]);
});

export const pushToLogAtom = atom<null, [newItem: string], void>(null, (get, set, newItem) => {
	const current = get(logAtom);
	set(logAtom, [...current, newItem]);
});

export const clearLogAtom = atom(null, (_get, set) => set(logAtom, RESET));
