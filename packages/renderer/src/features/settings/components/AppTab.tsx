import { useAtom } from 'jotai';
import { useState } from 'react';
import { useSetting } from '~/hooks';
import { SettingsKey } from 'shared';
import { Switch } from '~/components/Switch';
import { Button } from '~/components/Button';
import { updateAvailableAtom } from '~/atoms/app';

export const AppTab = () => {
	const [updateButtonDisabled, setUpdateButtonDisabled]           = useState(false);
	const [updateAvailable]                                         = useAtom(updateAvailableAtom);
	const [hideSetupWindow, setHideSetupWindow]                     = useSetting<boolean>(SettingsKey.HideSetupWindow, { reactive: false });
	const [enableUpdateNotifications, setEnableUpdateNotifications] = useSetting<boolean>(SettingsKey.EnableNewReleaseToast, { reactive: false });
	const [autoStartEnabled, setAutoStartEnabled]                   = useSetting<boolean>(SettingsKey.AutoStart, { reactive: false });

	const checkForUpdates = async () => {
		setUpdateButtonDisabled(true);

		const hasUpdate = await window.api.hasNewRelease();
		if (!hasUpdate) {
			await window.api.showMessageBox({
				type: 'info',
				title: 'Check for updates',
				message: 'You are using the latest version of yay!'
			});
		}

		setUpdateButtonDisabled(false);
	};

	return (
		<div className="flex flex-col items space-y-6">
			<div className="flex flex-col items-start space-y-1.5">
				<p>Start on login</p>
				<Switch checked={autoStartEnabled} defaultChecked={autoStartEnabled} onCheckedChange={setAutoStartEnabled}/>
			</div>
			<div className="flex flex-col items-start space-y-1.5">
				<p>Hide setup window on startup</p>
				<Switch checked={hideSetupWindow} defaultChecked={hideSetupWindow} onCheckedChange={setHideSetupWindow}/>
			</div>
			<div className="flex flex-col items-start space-y-1.5">
				<p>Notify when an update is available</p>
				<Switch checked={enableUpdateNotifications} defaultChecked={enableUpdateNotifications} onCheckedChange={setEnableUpdateNotifications}/>
			</div>
			<div className="mt-auto">
				<Button variant="brand" onClick={checkForUpdates} disabled={updateButtonDisabled || updateAvailable}>Check for updates</Button>
			</div>
		</div>
	);
}
