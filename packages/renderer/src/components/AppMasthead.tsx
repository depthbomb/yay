import clsx from 'clsx';
import Icon from '@mdi/react';
import { useAtom } from 'jotai';
import { IconButton } from './IconButton';
import { workingAtom } from '~/atoms/app';
import { useState, useEffect } from 'react';
import { SeasonalLogo } from './SeasonalLogo';
import { windowPinnedAtom } from '~/atoms/app';
import { useThrottle, useModifierKey } from '~/hooks';
import { useLocation, useNavigate } from 'react-router';
import { mdiPin, mdiCog, mdiPinOff, mdiArrowLeft, mdiFolderOpen } from '@mdi/js';

export const AppMasthead = () => {
	const [isHome, setIsHome]               = useState(true);
	const [backIsHovered, setBackIsHovered] = useState(false);
	const location                          = useLocation();
	const openDownloadDir                   = useThrottle(window.api.openDownloadDir, 2_500);
	const navigate                          = useNavigate();
	const holdingAlt                        = useModifierKey('Alt');
	const [isWindowPinned, setWindowPinned] = useAtom(windowPinnedAtom);
	const [isWorking]                       = useAtom(workingAtom);

	const headerCss = clsx(
		'p-3 w-full flex flex-row items-center shrink-0',
		{
			'draggable': holdingAlt
		}
	);
	const backButtonIconCss = clsx(
		'size-5',
		{
			'-translate-x-0.5': backIsHovered
		},
		'transition-transform'
	);

	const onPinWindowButtonClicked = async () => {
		window.api.toggleWindowPinned().then(setWindowPinned);
	};

	useEffect(() => {
		setIsHome(location.pathname === '/');
		setBackIsHovered(!isHome);
	}, [location]);

	return (
		<header className={headerCss}>
			{isHome ? (
				<>
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
						<IconButton icon={mdiCog} title="Settings" tooltipPosition="left" to="settings" disabled={isWorking}/>
					</div>
				</>
			) : (
				<button
					onClick={() => navigate(-1)}
					onMouseEnter={() => setBackIsHovered(true)}
					onMouseLeave={() => setBackIsHovered(false)}
					className="flex flex-row items-center space-x-1 text-gray-100 hover:text-gray-300 active:text-gray-400 transition-colors">
					<Icon path={mdiArrowLeft} className={backButtonIconCss}/>
					<span>Back</span>
				</button>
			)}
		</header>
	);
};
