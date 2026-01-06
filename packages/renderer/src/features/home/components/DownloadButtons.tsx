import { cva } from 'cva';
import { Icon } from '@mdi/react';
import { mdiCancel } from '@mdi/js';
import { Button } from '~/components/Button';
import { mdiVideo, mdiMusicNote } from '@mdi/js';
import type { FC } from 'react';

export interface IDownloadButtonsProps {
	disabled: boolean;
	working: boolean;
	onDownloadVideoClick: () => void;
	onDownloadAudioClick: () => void;
	onCancelDownloadClick: () => void;
}

const container = cva({
	base: 'relative p-px w-full h-8 flex flex-row items-stretch justify-stretch shrink-0 rounded',
	variants: {
		disabled: {
			false: 'bg-linear-to-r from-accent-400 to-accent-600 after:absolute after:w-full after:h-8 after:bg-linear-to-r after:from-accent-400 after:to-accent-600 after:blur after:-z-10',
			true: 'bg-gray-800',
		}
	},
	defaultVariants: {
		disabled: false
	}
});

const button = cva({
	base: 'flex flex-row items-center justify-center space-x-1 w-1/2 text-sm font-display',
	variants: {
		disabled: {
			false: 'bg-black text-accent-500-contrast transition-colors hover:text-white hover:bg-transparent active:text-white active:bg-black/50',
			true: 'cursor-not-allowed! text-gray-500 bg-gray-900'
		}
	},
	defaultVariants: {
		disabled: false
	}
});

export const DownloadButtons: FC<IDownloadButtonsProps> = ({
	disabled,
	working,
	onDownloadVideoClick,
	onDownloadAudioClick,
	onCancelDownloadClick
}) => {
	const buttonCss = button({ disabled });
	return (!working ? (
		<div className={container({ disabled })}>
			<button onClick={onDownloadVideoClick} className={`${buttonCss} rounded-l`} disabled={disabled} type="button">
				<Icon path={mdiVideo} className="size-5"/>
				<span>Download Video</span>
			</button>
			<span className="w-px h-full shrink-0 bg-transparent"></span>
			<button onClick={onDownloadAudioClick} className={`${buttonCss} rounded-r`} disabled={disabled} type="button">
				<Icon path={mdiMusicNote} className="size-5"/>
				<span>Download Audio</span>
			</button>
		</div>
	) : (
		<Button onClick={onCancelDownloadClick} type="danger" size="lg">
			<Icon path={mdiCancel} className="size-4"/>
			<span>Cancel</span>
		</Button>
	));
};
