import { atom } from 'jotai';
import type { ESettingsKey } from 'shared';

export const settingsAtom = atom<Partial<Record<ESettingsKey, unknown>>>({});
