import { atom } from 'jotai';
import type { WritableAtom } from 'jotai';
import type { SettingsKey } from '../ipc/ipc.generated';

const settingAtoms = new Map<SettingsKey, WritableAtom<unknown, [unknown], void>>();

export const settingsAtom = atom<Partial<Record<SettingsKey, unknown>>>({});

export function settingAtom(key: SettingsKey) {
	let selected = settingAtoms.get(key);
	if (!selected) {
		selected = atom(
			get => get(settingsAtom)[key],
			(_get, set, value: unknown) => {
				set(settingsAtom, previous => ({
					...previous,
					[key]: value,
				}));
			},
		);
		settingAtoms.set(key, selected);
	}

	return selected;
}
