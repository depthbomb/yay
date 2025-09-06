import { useAtom } from 'jotai';
import { useSetting } from '~/hooks';
import { SettingsKey } from 'shared';
import { Switch } from '~/components/Switch';
import { Button } from '~/components/Button';
import { updateAvailableAtom } from '~/atoms/app';

export const AppTab = () => {
	const [updateAvailable]                                         = useAtom(updateAvailableAtom);
	const [hideSetupWindow, setHideSetupWindow]                     = useSetting<boolean>(SettingsKey.HideSetupWindow, { reactive: false });
	const [enableUpdateNotifications, setEnableUpdateNotifications] = useSetting<boolean>(SettingsKey.EnableNewReleaseToast, { reactive: false });
	const [autoStartEnabled, setAutoStartEnabled]                   = useSetting<boolean>(SettingsKey.AutoStart, { reactive: false });

	const checkForUpdates = async () => {
		const hasUpdate = await window.ipc.invoke('updater<-check-for-updates');
		if (!hasUpdate) {
			await window.ipc.invoke('show-message-box', {
				type: 'info',
				title: 'Check for updates',
				message: 'You are using the latest version of yay!'
			});
		}
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
			<div className="space-x-2 flex items-center">
				<Button variant="brand" onClick={checkForUpdates} disabled={updateAvailable}>Check for updates</Button>
				<Button variant="brand" onClick={() => window.ipc.invoke('main<-open-log-file')}>Open log file</Button>
				<Button variant="brand" onClick={() => window.ipc.invoke('main<-open-app-data')}>Open data folder</Button>
			</div>
		</div>
	);
}
