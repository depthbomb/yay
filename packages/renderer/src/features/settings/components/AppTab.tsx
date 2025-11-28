import { useSetting } from '~/hooks';
import { ESettingsKey } from 'shared';
import { Button } from '~/components/Button';
import { Switch } from '~/components/Switch';
import { mdiMicrosoftWindows } from '@mdi/js';
import { KeyCombo } from '~/components/KeyCombo';
import { SectionSeparator } from './SectionSeparator';

export const AppTab = () => {
	const [autoStartEnabled, setAutoStartEnabled]                     = useSetting<boolean>(ESettingsKey.AutoStart, { reactive: false });
	const [enableYtdlpUpdateOnStartup, setEnableYtdlpUpdateOnStartup] = useSetting<boolean>(ESettingsKey.UpdateYtdlpOnStartup, { reactive: true });
	const [hideSetupWindow, setHideSetupWindow]                       = useSetting<boolean>(ESettingsKey.HideSetupWindow, { reactive: false });
	const [globalMenuEnabled, setGlobalMenuEnabled]                   = useSetting<boolean>(ESettingsKey.EnableGlobalMenu, { reactive: false });
	const [enableUpdateNotifications, setEnableUpdateNotifications]   = useSetting<boolean>(ESettingsKey.EnableNewReleaseToast, { reactive: false });

	return (
		<div className="flex flex-col items space-y-6">
			<Switch label="Launch on startup" checked={autoStartEnabled} defaultChecked={autoStartEnabled} onCheckedChange={setAutoStartEnabled}/>
			<Switch label="Update yt-dlp on startup" checked={enableYtdlpUpdateOnStartup} defaultChecked={enableYtdlpUpdateOnStartup} onCheckedChange={setEnableYtdlpUpdateOnStartup}/>
			<Switch label="Hide setup window on startup" checked={hideSetupWindow} defaultChecked={hideSetupWindow} onCheckedChange={setHideSetupWindow}/>
			<Switch label="Notify when an update is available" checked={enableUpdateNotifications} defaultChecked={enableUpdateNotifications} onCheckedChange={setEnableUpdateNotifications}/>
			<Switch label={<>Global menu (<KeyCombo keys={[{ iconPath: mdiMicrosoftWindows, name: 'win' }, 'y']}/>)</>} checked={globalMenuEnabled} defaultChecked={globalMenuEnabled} onCheckedChange={setGlobalMenuEnabled}/>
			<SectionSeparator/>
			<div className="space-x-2 flex items-center">
				<Button type="brand" onClick={() => window.ipc.invoke('main<-open-app-data')}>Open data folder</Button>
				<Button type="brand" onClick={() => window.ipc.invoke('main<-open-external-url', 'https://github.com/depthbomb/yay/issues/new?template=bug_report.md')}>Report a bug</Button>
			</div>
		</div>
	);
}
