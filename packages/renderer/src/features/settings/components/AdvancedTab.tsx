import Icon from '@mdi/react';
import { useAtom } from 'jotai';
import { useSetting } from '~/hooks';
import { SettingsKey } from 'shared';
import { Switch } from '~/components/Switch';
import { PushButton } from '~/components/PushButton';
import { workingAtom, updatingAtom } from '~/atoms/app';
import { mdiUpdate, mdiRestore, mdiDownload } from '@mdi/js';

const onRecheckBinariesButtonClicked = async () => {
	const { response } = await window.api.showMessageBox({
		type: 'info',
		title: 'Recheck binaries',
		message: 'yay needs to restart to check necessary binaries.\nWould you like to continue?',
		buttons: ['Yes', 'No'],
		defaultId: 0
	});

	if (response === 0) {
		await window.api.recheckBinaries();
	}
};

const onResetSettingsButtonClicked = async () => {
	const { response } = await window.api.showMessageBox({
		type: 'info',
		title: 'Reset settings',
		message: 'Your settings will be reset to their defaults and yay will restart.\nWould you like to continue?',
		buttons: ['Yes', 'No'],
		defaultId: 0
	});

	if (response === 0) {
		await window.api.resetSettings();
	}
};

export const AdvancedTab = () => {
	const [isWorking]  = useAtom(workingAtom);
	const [isUpdating] = useAtom(updatingAtom);
	const [disableHardwareAcceleration, setDisableHardwareAcceleration] = useSetting<boolean>(SettingsKey.DisableHardwareAcceleration, { reactive: false });

	return (
		<div className="flex flex-col items-start space-y-6">
			<div className="flex flex-col items-start space-y-1.5">
				<p>Hardware acceleration</p>
				<Switch checked={!disableHardwareAcceleration} defaultChecked={!disableHardwareAcceleration} onCheckedChange={checked => setDisableHardwareAcceleration(!checked)}/>
				<p className="text-xs">Requires an app restart</p>
			</div>
			<div className="flex flex-col items-start space-y-1.5">
				<p>Actions</p>

				<PushButton onClick={onRecheckBinariesButtonClicked} disabled={isWorking || isUpdating}>
					<Icon path={mdiDownload} className="size-3"/>
					<span>Recheck required binaries</span>
				</PushButton>
				<PushButton onClick={() => window.api.updateYtdlpBinary()} disabled={isWorking || isUpdating}>
					<Icon path={mdiUpdate} className="size-3"/>
					<span>Update yt-dlp</span>
				</PushButton>
				<PushButton variant="danger" onClick={onResetSettingsButtonClicked} disabled={isWorking || isUpdating}>
					<Icon path={mdiRestore} className="size-4"/>
					<span>Reset settings</span>
				</PushButton>
			</div>
		</div>
	);
};
