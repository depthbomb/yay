import { useAtom } from 'jotai';
import { Icon } from '@mdi/react';
import { native } from '~/native';
import { Section } from './Section';
import { useSetting } from '~/hooks';
import { Button } from '~/components/Button';
import { Switch } from '~/components/Switch';
import { SectionSeparator } from './SectionSeparator';
import { workingAtom, updatingAtom } from '~/atoms/app';
import { mdiUpdate, mdiRestore, mdiDownload } from '@mdi/js';
import { SettingsKey, RequestChannel } from '~/ipc/ipc.generated';

const onRecheckBinariesButtonClicked = async () => {
	const { data } = await native.ipc.invoke(RequestChannel.MainShowMessageBox, {
		type: 'info',
		title: 'Recheck binaries',
		message: 'yay needs to restart to check necessary binaries.\nWould you like to continue?',
		buttons: ['Yes', 'No'],
		defaultId: 0
	});

	if (data.response === 0) {
		await native.ipc.invoke(RequestChannel.YtDlpRecheckBinaries);
	}
};

const onResetSettingsButtonClicked = async () => {
	const { data } = await native.ipc.invoke(RequestChannel.MainShowMessageBox, {
		type: 'info',
		title: 'Reset settings',
		message: 'Your settings will be reset to their defaults and yay will restart.\nWould you like to continue?',
		buttons: ['Yes', 'No'],
		defaultId: 0
	});

	if (data.response === 0) {
		await native.ipc.invoke(RequestChannel.SettingsReset);
	}
};

export const AdvancedTab = () => {
	const [isWorking]  = useAtom(workingAtom);
	const [isUpdating] = useAtom(updatingAtom);
	const [disableHardwareAcceleration, setDisableHardwareAcceleration] = useSetting(SettingsKey.DisableHardwareAcceleration, { reactive: false });

	return (
		<div className="flex flex-col space-y-6">
			<Section>
				<Switch label="Hardware acceleration" subtitle="Requires an app restart" checked={!disableHardwareAcceleration} defaultChecked={!disableHardwareAcceleration} onCheckedChange={checked => setDisableHardwareAcceleration(!checked)}/>
			</Section>
			<SectionSeparator/>
			<Section title="Actions">
				<Button onClick={onRecheckBinariesButtonClicked} disabled={isWorking || isUpdating}>
					<Icon path={mdiDownload} className="size-4"/>
					<span>Recheck required binaries</span>
				</Button>
				<Button onClick={() => native.ipc.invoke(RequestChannel.YtDlpUpdateBinary)} disabled={isWorking || isUpdating}>
					<Icon path={mdiUpdate} className="size-4"/>
					<span>Update yt-dlp</span>
				</Button>
				<Button type="danger" onClick={onResetSettingsButtonClicked} disabled={isWorking || isUpdating}>
					<Icon path={mdiRestore} className="size-4"/>
					<span>Reset settings</span>
				</Button>
			</Section>
		</div>
	);
};
