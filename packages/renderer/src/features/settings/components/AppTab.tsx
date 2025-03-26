import { useSetting } from '~/hooks';
import { SettingsKey } from 'shared';
import { Badge } from '~/components/Badge';
import { useState, useEffect } from 'react';
import { mdiMicrosoftWindows } from '@mdi/js';
import { KeyCombo } from '~/components/KeyCombo';
import { ToggleButton } from '~/components/ToggleButton';

export const AppTab = () => {
	const [showWindowFrame, setShowWindowFrame]     = useSetting(SettingsKey.ShowWindowFrame, { defaultValue: false });
	const [showHintFooter, setShowHintFooter]       = useSetting(SettingsKey.ShowHintFooter, { defaultValue: true });
	const [autoStartEnabled, setAutoStartEnabled]   = useState(false);
	const [globalMenuEnabled, setGlobalMenuEnabled] = useState(false);

	const onToggleAutoStartButtonClicked = async () => {
		await window.api.toggleAutoStart();
		setAutoStartEnabled(!autoStartEnabled);
	};

	const onEnableGlobalMenuButtonClicked = async () => {
		window.api.toggleGlobalMenu().then(setGlobalMenuEnabled);
	};

	useEffect(() => {
		window.api.getAutoStart().then(setAutoStartEnabled);
	}, []);

	useEffect(() => {
		window.api.getGlobalMenuEnabled().then(setGlobalMenuEnabled);
	}, []);

	return (
		<div className="flex flex-col space-y-6">
			<div className="flex flex-col items-start space-y-1.5">
				<p>Start on login</p>
				<ToggleButton enabled={autoStartEnabled} onClick={onToggleAutoStartButtonClicked}/>
			</div>
			<div className="flex flex-col items-start space-y-1.5">
				<p>Global menu (<KeyCombo keys={[{ iconPath: mdiMicrosoftWindows, name: 'win' }, 'y']}/>) <Badge label="Experimental" type="warning"/></p>
				<ToggleButton enabled={globalMenuEnabled} onClick={onEnableGlobalMenuButtonClicked}/>
			</div>
			<div className="flex flex-col items-start space-y-1.5">
				<p>Show hints</p>
				<ToggleButton enabled={showHintFooter} onClick={() => setShowHintFooter(!showHintFooter)}/>
			</div>
			<div className="flex flex-col items-start space-y-1.5">
				<p>Show window frame</p>
				<ToggleButton enabled={showWindowFrame} onClick={() => setShowWindowFrame(!showWindowFrame)}/>
				<p className="text-xs">This change takes effect on app restart</p>
			</div>
		</div>
	);
}
