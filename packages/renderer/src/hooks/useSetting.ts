import { useState, useEffect } from 'react';
import { IpcChannel, SettingsKey } from 'shared';

type UseSettingsOptions<T> = {
	defaultValue?: T;
	secure?: boolean;
};

export const useSetting = <T>(key: SettingsKey, options: UseSettingsOptions<T>) => {
	const { defaultValue, secure } = options;
	const [value, setValue]        = useState<T>(window.settings.getValue<T>(key, defaultValue, secure));

	const setSettingValue = async (newValue: T) => {
		setValue(newValue);
		await window.api.setSettingsValue(key, newValue, secure);
	};

	const onSettingsUpdate = (settingsKey: string, newValue: T) => {
		if (settingsKey !== key) {
			return;
		}

		setValue(newValue);
	};

	useEffect(() => {
		const removeListener = window.ipc.on(IpcChannel.SettingsUpdated, onSettingsUpdate);

		return () => removeListener();
	});

	return [value, setSettingValue] as const;
};
