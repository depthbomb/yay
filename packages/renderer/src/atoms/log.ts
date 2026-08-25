import { atom } from 'jotai';
import { RESET, atomWithReset } from 'jotai/utils';

export const MAX_LOG_HISTORY_LENGTH = 250 as const;

export type LogEntry = {
	id: number;
	line: string;
};

let nextLogEntryID = 0;

export const logAtom = atomWithReset<LogEntry[]>([]);

export const shiftLogAtom = atom(null, (get, set) => {
	const current = get(logAtom).slice(1);
	set(logAtom, [...current]);
});

export const pushToLogAtom = atom<null, [newItem: string], void>(null, (get, set, newItem) => {
	set(logAtom, appendLogEntries(get(logAtom), [newItem]));
});

export const pushManyToLogAtom = atom<null, [newItems: string[]], void>(null, (get, set, newItems) => {
	set(logAtom, appendLogEntries(get(logAtom), newItems));
});

export const clearLogAtom = atom(null, (_get, set) => set(logAtom, RESET));

export const appendLogEntries = (current: LogEntry[], newItems: string[]) => {
	const entries = newItems.map(line => ({ id: nextLogEntryID++, line }));
	return [...current, ...entries].slice(-MAX_LOG_HISTORY_LENGTH);
};
