import { atom } from 'jotai';
import { isValidURL } from 'shared';
import { RESET, atomWithReset } from 'jotai/utils';

export const updateAvailableAtom = atomWithReset<boolean>(false);
export const updatingAtom        = atomWithReset<boolean>(false);
export const workingAtom         = atomWithReset<boolean>(false);
export const urlAtom             = atomWithReset<string>('');
export const isURLValidAtom      = atom(get => isValidURL(get(urlAtom)));

export const resetAppAtom = atom(null, (_get, set) => {
	set(workingAtom, RESET);
	set(urlAtom, RESET);
});
