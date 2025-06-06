import clsx from 'clsx';
import Icon from '@mdi/react';
import { useAtom } from 'jotai';
import { Tooltip } from './Tooltip';
import { IconButton } from './IconButton';
import { useState, useEffect } from 'react';
import { SeasonalLogo } from './SeasonalLogo';
import { windowPinnedAtom } from '~/atoms/app';
import { updateAvailableAtom } from '~/atoms/app';
import { useThrottle, useModifierKey } from '~/hooks';
import { mdiPin, mdiCog, mdiUpdate, mdiPinOff, mdiFolderOpen } from '@mdi/js';

const UpdateIndicator = () => {
	const [isColored, setIsColored] = useState(false);

	useEffect(() => {
		const interval = setInterval(() => setIsColored(prev => !prev), 500);

		return () => clearInterval(interval);
	}, []);

	return (
		<Tooltip content="Update available!">
			<button className="p-1" type="button" onClick={() => window.api.showUpdaterWindow()}>
				<Icon path={mdiUpdate} className={`size-4 ${isColored ? 'text-yellow-500' : 'text-white'}`}/>
			</button>
		</Tooltip>
	);
};

export const AppMasthead = () => {
	const openDownloadDir                   = useThrottle(window.api.openDownloadDir, 2_500);
	const holdingAlt                        = useModifierKey('Alt');
	const [isWindowPinned, setWindowPinned] = useAtom(windowPinnedAtom);
	const [updateAvailable]                 = useAtom(updateAvailableAtom);

	const headerCss = clsx(
		'pt-3 px-3 w-full flex items-center shrink-0',
		{
			'draggable': holdingAlt
		}
	);

	const onPinWindowButtonClicked = () => window.api.toggleWindowPinned().then(setWindowPinned);

	return (
		<header className={headerCss}>
			<SeasonalLogo/>
			<div className="flex space-x-0.5 shrink-0 z-10">
				{updateAvailable && <UpdateIndicator/>}
				<IconButton icon={mdiFolderOpen} title="Open download folder" tooltipSide="bottom" onClick={() => openDownloadDir()}/>
				<IconButton icon={isWindowPinned ? mdiPinOff : mdiPin} title={isWindowPinned ? 'Unpin menu' : 'Pin menu'} tooltipSide="bottom" onClick={onPinWindowButtonClicked}/>
				<IconButton icon={mdiCog} title="Settings" tooltipSide="bottom" onClick={() => window.api.showSettingsUI()}/>
			</div>
		</header>
	);
};
