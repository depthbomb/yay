import { useSetting } from '~/hooks';
import { ESettingsKey } from 'shared';
import { Switch } from '~/components/Switch';
import { mdiMicrosoftWindows } from '@mdi/js';
import { KeyCombo } from '~/components/KeyCombo';

export const InterfaceTab = () => {
	const [showHintFooter, setShowHintFooter]       = useSetting<boolean>(ESettingsKey.ShowHintFooter, { reactive: false });
	const [globalMenuEnabled, setGlobalMenuEnabled] = useSetting<boolean>(ESettingsKey.EnableGlobalMenu, { reactive: false });

	return (
		<div className="flex flex-col items space-y-6">
			<div className="flex flex-col items-start space-y-1.5">
				<p>Global menu (<KeyCombo keys={[{ iconPath: mdiMicrosoftWindows, name: 'win' }, 'y']}/>)</p>
				<Switch checked={globalMenuEnabled} defaultChecked={globalMenuEnabled} onCheckedChange={setGlobalMenuEnabled}/>
			</div>
			<div className="flex flex-col items-start space-y-1.5">
				<p>Show hints</p>
				<Switch checked={showHintFooter} defaultChecked={showHintFooter} onCheckedChange={setShowHintFooter}/>
			</div>
		</div>
	);
}
