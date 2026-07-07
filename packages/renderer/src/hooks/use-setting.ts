import { useAtom } from 'jotai';
import { useEffect } from 'react';
import { settingsAtom } from '../atoms/settings';
import type { ESettingsKey } from 'shared';

type UseSettingsOptions = {
	reactive?: boolean;
};

export const useSetting = <T>(settingsKey: ESettingsKey, options?: UseSettingsOptions) => {
	const isReactive              = options?.reactive ?? true;
	const [settings, setSettings] = useAtom(settingsAtom);

	const value = settings[settingsKey] as T;

	const setSettingValue = async (newValue: T) => {
		setSettings(previous => ({ ...previous, [settingsKey]: newValue }));
		await window.ipc.invoke('settings<-set', settingsKey, newValue);
	};

	useEffect(() => {
		if (isReactive) {
			const removeListener = window.ipc.on('settings->changed', ({ key, value }) => {
				if (key !== settingsKey) {
					return;
				}

				setSettings(previous => ({ ...previous, [key]: value }));
			});

			return () => removeListener();
		}
	}, [settingsKey, isReactive, setSettings]);

	return [value, setSettingValue] as const;
};
