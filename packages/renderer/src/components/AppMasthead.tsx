import clsx from 'clsx';
import { useAtom } from 'jotai';
import { IconButton } from './IconButton';
import { workingAtom } from '~/atoms/app';
import { SeasonalLogo } from './SeasonalLogo';
import { windowPinnedAtom } from '~/atoms/app';
import { useThrottle, useModifierKey } from '~/hooks';
import { mdiPin, mdiCog, mdiPinOff, mdiFolderOpen } from '@mdi/js';

export const AppMasthead = () => {
	const openDownloadDir                   = useThrottle(window.api.openDownloadDir, 2_500);
	const holdingAlt                        = useModifierKey('Alt');
	const [isWindowPinned, setWindowPinned] = useAtom(windowPinnedAtom);
	const [isWorking]                       = useAtom(workingAtom);

	const headerCss = clsx(
		'p-3 w-full flex flex-row items-center shrink-0',
		{
			'draggable': holdingAlt
		}
	);

	const onPinWindowButtonClicked = async () => window.api.toggleWindowPinned().then(setWindowPinned);

	return (
		<header className={headerCss}>
			<SeasonalLogo/>
			<h1 className="text-md font-semibold shrink-0">Yet Another YouTube Downloader</h1>
			<span className="w-full"></span>
			<div className="flex space-x-0.5">
				<IconButton icon={mdiFolderOpen} title="Open download folder" tooltipPosition="left" onClick={() => openDownloadDir()}/>
				<IconButton
					icon={isWindowPinned ? mdiPinOff : mdiPin}
					title={isWindowPinned ? 'Unpin menu' : 'Pin menu'}
					tooltipPosition="left"
					onClick={onPinWindowButtonClicked}/>
				<IconButton icon={mdiCog} title="Settings" tooltipPosition="left" onClick={() => window.api.showSettingsUI()} disabled={isWorking}/>
			</div>
		</header>
	);
};
