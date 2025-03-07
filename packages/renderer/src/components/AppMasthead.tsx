import clsx from 'clsx';
import Icon from '@mdi/react';
import { useAtom } from 'jotai';
import logo from '~/assets/img/logo.svg';
import { IconButton } from './IconButton';
import { workingAtom } from '~/atoms/app';
import { useState, useEffect } from 'react';
import { useThrottle, useModifierKey } from '~/hooks';
import { useLocation, useNavigate } from 'react-router';
import { mdiCog, mdiArrowLeft, mdiFolderOpen } from '@mdi/js';

export const AppMasthead = () => {
	const [isHome, setIsHome]               = useState(true);
	const [backIsHovered, setBackIsHovered] = useState(false);
	const location                          = useLocation();
	const openDownloadDir                   = useThrottle(window.api.openDownloadDir, 2_500);
	const navigate                          = useNavigate();
	const holdingAlt                        = useModifierKey('Alt');
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

	useEffect(() => {
		setIsHome(location.pathname === '/');
		setBackIsHovered(!isHome);
	}, [location]);

	return (
		<header className={headerCss}>
			{isHome ? (
				<>
					<img src={logo} className="mr-2 size-7" draggable="false"/>
					<h1 className="text-md font-semibold shrink-0">Yet Another YouTube Downloader</h1>
					<span className="w-full"></span>
					<div className="flex space-x-0.5">
						<IconButton icon={mdiFolderOpen} title="Open download folder" tooltipPosition="left" onClick={() => openDownloadDir()}/>
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
