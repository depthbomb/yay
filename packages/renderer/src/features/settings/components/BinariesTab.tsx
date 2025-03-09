import Icon from '@mdi/react';
import { Button } from '~/components/Button';
import { mdiUpdate, mdiDownload } from '@mdi/js';

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

export const BinariesTab = () => {
	return (
		<div className="flex flex-col items-start space-y-1.5">
			<Button onClick={onRecheckBinariesButtonClicked}>
				<Icon path={mdiDownload} className="size-3"/>
				<span>Recheck required binaries</span>
			</Button>
			<Button onClick={() => window.api.updateYtdlpBinary()}>
				<Icon path={mdiUpdate} className="size-3"/>
				<span>Update yt-dlp</span>
			</Button>
		</div>
	);
};
