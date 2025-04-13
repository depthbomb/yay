import { useState, useEffect } from 'react';
import { IpcChannel, SettingsKey } from 'shared';

type UseSettingsOptions<T> = {
	defaultValue?: T;
	reactive?: boolean;
};

export const useSetting = <T>(key: SettingsKey, options?: UseSettingsOptions<T>) => {
	const isReactive        = options?.reactive ?? true;
	const [value, setValue] = useState<T>(window.settings.getValue<T>(key, options?.defaultValue));

	const setSettingValue = async (newValue: T) => {
		setValue(newValue);
		await window.api.setSettingsValue(key, newValue);
	};

	useEffect(() => {
		if (isReactive) {
			const onSettingsUpdate = (settingsKey: string, newValue: T) => {
				if (settingsKey !== key) {
					return;
				}
				setValue(newValue);
			};

			const removeListener = window.ipc.on(IpcChannel.Settings_Changed, onSettingsUpdate);
			return () => removeListener();
		}

		return () => {};
	}, [key, isReactive]);

	return [value, setSettingValue] as const;
};
