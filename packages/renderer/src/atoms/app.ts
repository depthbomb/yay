import { atom } from 'jotai';
import { isValidHttpUrl } from 'shared';
import { RESET, atomWithReset } from 'jotai/utils';

export const updateAvailableAtom = atomWithReset<boolean>(false);
export const updatingAtom        = atomWithReset<boolean>(false);
export const workingAtom         = atomWithReset<boolean>(false);
export const urlAtom             = atomWithReset<string>('');
export const isUrlValidAtom      = atom(get => isValidHttpUrl(get(urlAtom)));

export const resetAppAtom = atom(null, (_get, set) => {
	set(workingAtom, RESET);
	set(urlAtom, RESET);
});
