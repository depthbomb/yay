import { ESettingsKey } from 'shared';
import { useState, useEffect } from 'react';

type UseSettingsOptions<T> = {
	defaultValue?: T;
	reactive?: boolean;
};

export const useSetting = <T>(settingsKey: ESettingsKey, options?: UseSettingsOptions<T>) => {
	const isReactive        = options?.reactive ?? true;
	const [value, setValue] = useState<T>(window.settings.getValue(settingsKey, options?.defaultValue)?.data);

	const setSettingValue = async (newValue: T) => {
		setValue(newValue);
		await window.ipc.invoke('settings<-set', settingsKey, newValue);
	};

	useEffect(() => {
		if (isReactive) {
			const removeListener = window.ipc.on('settings->changed', ({ key, value }) => {
				if (key !== settingsKey) {
					return;
				}

				setValue(value);
			});

			return () => removeListener();
		}
	}, [settingsKey, isReactive]);

	return [value, setSettingValue] as const;
};
