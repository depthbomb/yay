import { native } from '~/native';
import { useEffect } from 'react';
import { useAtom, useStore } from 'jotai';
import { settingAtom } from '../atoms/settings';
import { persistSetting } from '../atoms/persist-setting';
import { EventChannel, RequestChannel } from '../ipc/ipc.generated';
import type { SettingsKey, SettingsValues } from '../ipc/ipc.generated';

type UseSettingsOptions = {
	reactive?: boolean;
};

export const useSetting = <K extends SettingsKey>(settingsKey: K, options?: UseSettingsOptions) => {
	const isReactive       = options?.reactive ?? true;
	const [value, setValue] = useAtom(settingAtom(settingsKey));
	const store            = useStore();

	const setSettingValue = async (newValue: SettingsValues[K]) => {
		const error = await persistSetting(store, native.ipc, settingsKey, newValue);
		if (error !== null) {
			await native.ipc.invoke(RequestChannel.MainShowMessageBox, {
				type:    'error',
				title:   'Could not save setting',
				message: error,
			});
		}
	};

	useEffect(() => {
		if (isReactive) {
			const removeListener = native.ipc.on(EventChannel.SettingsChanged, ({ key, value }) => {
				if (key !== settingsKey) {
					return;
				}

				setValue(value);
			});

			return () => removeListener();
		}
	}, [settingsKey, isReactive, setValue]);

	return [value as SettingsValues[K], setSettingValue] as const;
};
