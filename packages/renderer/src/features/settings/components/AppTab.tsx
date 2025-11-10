import { useAtom } from 'jotai';
import { useSetting } from '~/hooks';
import { ESettingsKey } from 'shared';
import { Button } from '~/components/Button';
import { mdiMicrosoftWindows } from '@mdi/js';
import { SwitchV2 } from '~/components/SwitchV2';
import { KeyCombo } from '~/components/KeyCombo';
import { updateAvailableAtom } from '~/atoms/app';

export const AppTab = () => {
	const [updateAvailable]                                           = useAtom(updateAvailableAtom);
	const [autoStartEnabled, setAutoStartEnabled]                     = useSetting<boolean>(ESettingsKey.AutoStart, { reactive: false });
	const [enableYtdlpUpdateOnStartup, setEnableYtdlpUpdateOnStartup] = useSetting<boolean>(ESettingsKey.UpdateYtdlpOnStartup, { reactive: true });
	const [hideSetupWindow, setHideSetupWindow]                       = useSetting<boolean>(ESettingsKey.HideSetupWindow, { reactive: false });
	const [globalMenuEnabled, setGlobalMenuEnabled]                   = useSetting<boolean>(ESettingsKey.EnableGlobalMenu, { reactive: false });
	const [enableUpdateNotifications, setEnableUpdateNotifications]   = useSetting<boolean>(ESettingsKey.EnableNewReleaseToast, { reactive: false });

	const checkForUpdates = async () => {
		const hasUpdate = await window.ipc.invoke('updater<-check-for-updates');
		if (!hasUpdate) {
			await window.ipc.invoke('main<-show-message-box', {
				type: 'info',
				title: 'Check for updates',
				message: 'You are using the latest version of yay!'
			});
		}
	};

	return (
		<div className="flex flex-col items space-y-6">
			<SwitchV2 label="Launch on startup" checked={autoStartEnabled} defaultChecked={autoStartEnabled} onCheckedChange={setAutoStartEnabled}/>
			<SwitchV2 label="Update yt-dlp on startup" checked={enableYtdlpUpdateOnStartup} defaultChecked={enableYtdlpUpdateOnStartup} onCheckedChange={setEnableYtdlpUpdateOnStartup}/>
			<SwitchV2 label="Hide setup window on startup" checked={hideSetupWindow} defaultChecked={hideSetupWindow} onCheckedChange={setHideSetupWindow}/>
			<SwitchV2 label="Notify when an update is available" checked={enableUpdateNotifications} defaultChecked={enableUpdateNotifications} onCheckedChange={setEnableUpdateNotifications}/>
			<SwitchV2 label={<>Global menu (<KeyCombo keys={[{ iconPath: mdiMicrosoftWindows, name: 'win' }, 'y']}/>)</>} checked={globalMenuEnabled} defaultChecked={globalMenuEnabled} onCheckedChange={setGlobalMenuEnabled}/>
			<div className="space-x-2 flex items-center">
				<Button variant="brand" onClick={checkForUpdates} disabled={updateAvailable}>Check for updates</Button>
				<Button variant="brand" onClick={() => window.ipc.invoke('main<-open-app-data')}>Open data folder</Button>
				<Button variant="brand" onClick={() => window.ipc.invoke('main<-open-external-url', 'https://github.com/depthbomb/yay/issues/new?template=bug_report.md')}>Report a bug</Button>
			</div>
		</div>
	);
}
