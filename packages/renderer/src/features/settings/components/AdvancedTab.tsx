import { useAtom } from 'jotai';
import { Icon } from '@mdi/react';
import { useSetting } from '~/hooks';
import { ESettingsKey } from 'shared';
import { Button } from '~/components/Button';
import { Switch } from '~/components/Switch';
import { SectionSeparator } from './SectionSeparator';
import { workingAtom, updatingAtom } from '~/atoms/app';
import { mdiUpdate, mdiRestore, mdiDownload } from '@mdi/js';

const onRecheckBinariesButtonClicked = async () => {
	const { response } = await window.ipc.invoke('main<-show-message-box', {
		type: 'info',
		title: 'Recheck binaries',
		message: 'yay needs to restart to check necessary binaries.\nWould you like to continue?',
		buttons: ['Yes', 'No'],
		defaultId: 0
	});

	if (response === 0) {
		await window.ipc.invoke('yt-dlp<-recheck-binaries');
	}
};

const onResetSettingsButtonClicked = async () => {
	const { response } = await window.ipc.invoke('main<-show-message-box', {
		type: 'info',
		title: 'Reset settings',
		message: 'Your settings will be reset to their defaults and yay will restart.\nWould you like to continue?',
		buttons: ['Yes', 'No'],
		defaultId: 0
	});

	if (response === 0) {
		await window.ipc.invoke('settings<-reset');
	}
};

export const AdvancedTab = () => {
	const [isWorking]  = useAtom(workingAtom);
	const [isUpdating] = useAtom(updatingAtom);
	const [disableHardwareAcceleration, setDisableHardwareAcceleration] = useSetting<boolean>(ESettingsKey.DisableHardwareAcceleration, { reactive: false });

	return (
		<div className="flex flex-col space-y-6">
			<Switch label="Hardware acceleration" subtitle="Requires an app restart" checked={!disableHardwareAcceleration} defaultChecked={!disableHardwareAcceleration} onCheckedChange={checked => setDisableHardwareAcceleration(!checked)}/>
			<SectionSeparator/>
			<div className="flex flex-col items-start space-y-1.5">
				<h2 className="font-display">Actions</h2>
				<Button onClick={onRecheckBinariesButtonClicked} disabled={isWorking || isUpdating}>
					<Icon path={mdiDownload} className="size-4"/>
					<span>Recheck required binaries</span>
				</Button>
				<Button onClick={() => window.ipc.invoke('yt-dlp<-update-binary')} disabled={isWorking || isUpdating}>
					<Icon path={mdiUpdate} className="size-4"/>
					<span>Update yt-dlp</span>
				</Button>
				<Button type="danger" onClick={onResetSettingsButtonClicked} disabled={isWorking || isUpdating}>
					<Icon path={mdiRestore} className="size-4"/>
					<span>Reset settings</span>
				</Button>
			</div>
		</div>
	);
};
