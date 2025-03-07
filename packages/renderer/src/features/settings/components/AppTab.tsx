import { useSetting } from '~/hooks';
import { SettingsKey } from 'shared';
import { Badge } from '~/components/Badge';
import { useState, useEffect } from 'react';
import { mdiMicrosoftWindows } from '@mdi/js';
import { KeyCombo } from '~/components/KeyCombo';
import { ToggleButton } from '~/components/ToggleButton';

export const AppTab = () => {
	const [showWindowFrame, setShowWindowFrame]     = useSetting(SettingsKey.ShowWindowFrame, { defaultValue: false });
	const [autoStartEnabled, setAutoStartEnabled]   = useState(false);
	const [globalMenuEnabled, setGlobalMenuEnabled] = useState(false);

	const onToggleAutoStartButtonClicked = async () => {
		await window.api.toggleAutoStart();
		setAutoStartEnabled(!autoStartEnabled);
	};

	const onEnableGlobalMenuButtonClicked = async () => {
		setGlobalMenuEnabled(
			await window.api.toggleGlobalMenu()
		);
	};

	const onShowWindowFrameButtonClicked = async () => {
		await setShowWindowFrame(!showWindowFrame);
	};

	useEffect(() => {
		const fetchAutoStartState = async () => {
			setAutoStartEnabled(
				await window.api.getAutoStart()
			);
		};

		fetchAutoStartState().catch(console.error);
	}, []);

	useEffect(() => {
		const fetchIsGlobalMenuEnabled = async () => {
			setGlobalMenuEnabled(
				await window.api.getGlobalMenuEnabled()
			);
		};

		fetchIsGlobalMenuEnabled().catch(console.error);
	}, []);

	return (
		<div className="flex flex-col space-y-6">
			<div className="flex flex-col items-start space-y-1.5">
				<p>Start on login</p>
				<ToggleButton enabled={autoStartEnabled} onClick={onToggleAutoStartButtonClicked}/>
			</div>
			{/* --- */}
			<div className="flex flex-col items-start space-y-1.5">
				<p>Global menu (<KeyCombo keys={[{ iconPath: mdiMicrosoftWindows, name: 'win' }, 'y']}/>) <Badge label="Experimental" type="warning"/></p>
				<ToggleButton enabled={globalMenuEnabled} onClick={onEnableGlobalMenuButtonClicked}/>
			</div>
			{/* --- */}
			<div className="flex flex-col items-start space-y-1.5">
				<p>Show window frame</p>
				<ToggleButton enabled={showWindowFrame} onClick={onShowWindowFrameButtonClicked}/>
				<p className="text-xs">This change takes effect on app restart</p>
			</div>
		</div>
	);
}
