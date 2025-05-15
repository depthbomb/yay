import { useAtom } from 'jotai';
import { useSetting } from '~/hooks';
import { SettingsKey } from 'shared';
import { useState, useEffect } from 'react';
import { Switch } from '~/components/Switch';
import { Button } from '~/components/Button';
import { updateAvailableAtom, lastUpdateCheckAtom } from '~/atoms/app';

export const AppTab = () => {
	const [canCheckUpdates, setCanCheckUpdates]                     = useState(false);
	const [updateAvailable]                                         = useAtom(updateAvailableAtom);
	const [lastUpdateCheck, setLastUpdateCheck]                     = useAtom(lastUpdateCheckAtom);
	const [hideSetupWindow, setHideSetupWindow]                     = useSetting<boolean>(SettingsKey.HideSetupWindow, { reactive: false });
	const [enableUpdateNotifications, setEnableUpdateNotifications] = useSetting<boolean>(SettingsKey.EnableNewReleaseToast, { reactive: false });
	const [autoStartEnabled, setAutoStartEnabled]                   = useSetting<boolean>(SettingsKey.AutoStart, { reactive: false });

	const checkForUpdates = async () => {
		const hasUpdate = await window.api.checkForUpdates();
		if (!hasUpdate) {
			await window.api.showMessageBox({
				type: 'info',
				title: 'Check for updates',
				message: 'You are using the latest version of yay!'
			});
		}

		setLastUpdateCheck(new Date());
		setCanCheckUpdates(false);
	};

	useEffect(() => {
		const interval = setInterval(() => {
			const now = new Date();
			setCanCheckUpdates(lastUpdateCheck <= new Date(now.getTime() - 180 * 1_000));
		}, 1_000);

		return () => clearInterval(interval);
	}, [lastUpdateCheck]);

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
			<div className="space-x-2 flex items-center">
				<Button variant="brand" onClick={checkForUpdates} disabled={!canCheckUpdates || updateAvailable}>Check for updates</Button>
				<Button variant="brand" onClick={() => window.api.openLogFile()}>Open log file</Button>
				<Button variant="brand" onClick={() => window.api.openAppData()}>Open data folder</Button>
			</div>
		</div>
	);
}
