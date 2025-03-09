import Icon from '@mdi/react';
import { forwardRef } from 'react';
import { mdiUpdate, mdiDownload } from '@mdi/js';
import type { ButtonHTMLAttributes } from 'react';

type BinaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	icon: string;
};

const BinaryButton = forwardRef<HTMLButtonElement, BinaryButtonProps>(({ icon, onClick, ...props }, ref) => {
	return (
		<button ref={ref} onClick={onClick} className="px-2 space-x-1 flex items-center h-6 text-black text-xs bg-white rounded hover:bg-gray-300 active:bg-gray-400 transition-colors" type="button" {...props}>
			<Icon path={icon} className="size-3"/>
			<span>{props.children}</span>
		</button>
	);
});

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
			<BinaryButton icon={mdiDownload} onClick={onRecheckBinariesButtonClicked}>Recheck required binaries</BinaryButton>
			<BinaryButton icon={mdiUpdate} onClick={() => window.api.updateYtdlpBinary()}>Update yt-dlp</BinaryButton>
		</div>
	);
};
