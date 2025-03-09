import { clsx } from 'clsx';
import Icon from '@mdi/react';
import { mdiCancel } from '@mdi/js';
import { Button } from '~/components/Button';
import { mdiVideo, mdiMusicNote } from '@mdi/js';
import type { FC } from 'react';

type DownloadButtonsProps = {
	disabled: boolean;
	working: boolean;
	onDownloadVideoClick: () => void;
	onDownloadAudioClick: () => void;
	onCancelDownloadClick: () => void;
};

export const DownloadButtons: FC<DownloadButtonsProps> = ({
	disabled,
	working,
	onDownloadVideoClick,
	onDownloadAudioClick,
	onCancelDownloadClick
}) => {
	const containerCss = clsx(
		'relative',
		'flex flex-row shrink-0 items-stretch justify-stretch',
		'p-[1px] w-full h-8',
		{
			'bg-gradient-to-r from-[#FF0033] to-[#FF2790]': !disabled,
			'bg-gray-600': disabled,
		},
		'rounded',
		'gradient-shadow',
		{
			'after:absolute after:w-full after:h-8 after:bg-gradient-to-r after:from-[#FF0033] after:to-[#FF2790] after:blur after:-z-10': !disabled
		}
	);
	const buttonCss = clsx(
		'flex flex-row items-center justify-center',
		'space-x-1 w-full',
		'text-sm text-gray-200 font-semibold',
		'bg-black',
		{
			'cursor-not-allowed! text-gray-400': disabled,
			'hover:text-white hover:bg-transparent active:text-white active:bg-black/25': !disabled
		},
		'transition-all'
	);

	return (!working ? (
		<div className={containerCss}>
			<button onClick={onDownloadVideoClick} className={`${buttonCss} rounded-l`} disabled={disabled} type="button">
				<Icon path={mdiVideo} className="size-5"/>
				<span>Download Video</span>
			</button>
			<span className="w-[1px] h-full shrink-0 bg-black/30"></span>
			<button onClick={onDownloadAudioClick} className={`${buttonCss} rounded-r`} disabled={disabled} type="button">
				<Icon path={mdiMusicNote} className="size-5"/>
				<span>Download Audio</span>
			</button>
		</div>
	) : (
		<Button onClick={onCancelDownloadClick} size="lg">
			<Icon path={mdiCancel} className="size-4"/>
			<span>Cancel</span>
		</Button>
	));
};
