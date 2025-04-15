import { useSetting } from '~/hooks';
import { SettingsKey } from 'shared';
import { Switch } from '~/components/Switch';
import { mdiMicrosoftWindows } from '@mdi/js';
import { KeyCombo } from '~/components/KeyCombo';

export const AppTab = () => {
	const [showWindowFrame, setShowWindowFrame]                     = useSetting<boolean>(SettingsKey.ShowWindowFrame, { reactive: false });
	const [showHintFooter, setShowHintFooter]                       = useSetting<boolean>(SettingsKey.ShowHintFooter, { reactive: false });
	const [hideSetupWindow, setHideSetupWindow]                     = useSetting<boolean>(SettingsKey.HideSetupWindow, { reactive: false });
	const [enableUpdateNotifications, setEnableUpdateNotifications] = useSetting<boolean>(SettingsKey.EnableNewReleaseToast, { reactive: false });
	const [autoStartEnabled, setAutoStartEnabled]                   = useSetting<boolean>(SettingsKey.AutoStart, { reactive: false });
	const [globalMenuEnabled, setGlobalMenuEnabled]                 = useSetting<boolean>(SettingsKey.EnableGlobalMenu, { reactive: false });

	return (
		<div className="flex flex-col space-y-6">
			<div className="flex flex-col items-start space-y-1.5">
				<p>Start on login</p>
				<Switch checked={autoStartEnabled} defaultChecked={autoStartEnabled} onCheckedChange={setAutoStartEnabled}/>
			</div>
			<div className="flex flex-col items-start space-y-1.5">
				<p>Hide setup window on startup</p>
				<Switch checked={hideSetupWindow} defaultChecked={hideSetupWindow} onCheckedChange={setHideSetupWindow}/>
			</div>
			<div className="flex flex-col items-start space-y-1.5">
				<p>Global menu (<KeyCombo keys={[{ iconPath: mdiMicrosoftWindows, name: 'win' }, 'y']}/>)</p>
				<Switch checked={globalMenuEnabled} defaultChecked={globalMenuEnabled} onCheckedChange={setGlobalMenuEnabled}/>
			</div>
			<div className="flex flex-col items-start space-y-1.5">
				<p>Notify when an update is available</p>
				<Switch checked={enableUpdateNotifications} defaultChecked={enableUpdateNotifications} onCheckedChange={setEnableUpdateNotifications}/>
			</div>
			<div className="flex flex-col items-start space-y-1.5">
				<p>Show hints</p>
				<Switch checked={showHintFooter} defaultChecked={showHintFooter} onCheckedChange={setShowHintFooter}/>
			</div>
			<div className="flex flex-col items-start space-y-1.5">
				<p>Show window frame</p>
				<Switch checked={showWindowFrame} defaultChecked={showWindowFrame} onCheckedChange={setShowWindowFrame}/>
				<p className="text-xs">This change takes effect on app restart</p>
			</div>
		</div>
	);
}
