import clsx from 'clsx';
import { useAtom } from 'jotai';
import { IconButton } from './IconButton';
import { SeasonalLogo } from './SeasonalLogo';
import { windowPinnedAtom } from '~/atoms/app';
import { useThrottle, useModifierKey } from '~/hooks';
import { mdiPin, mdiCog, mdiPinOff, mdiFolderOpen } from '@mdi/js';

export const AppMasthead = () => {
	const openDownloadDir                   = useThrottle(() => window.ipc.invoke('main<-open-download-dir'), 2_500);
	const holdingAlt                        = useModifierKey('Alt');
	const [isWindowPinned, setWindowPinned] = useAtom(windowPinnedAtom);

	const headerCss = clsx(
		'pt-3 px-3 w-full flex items-center shrink-0',
		{
			'draggable': holdingAlt
		}
	);

	const onPinWindowButtonClicked = () => window.ipc.invoke('main<-toggle-window-pinned').then(setWindowPinned);

	return (
		<header className={headerCss}>
			<SeasonalLogo/>
			<div className="flex space-x-0.5 shrink-0 z-10">
				<IconButton icon={mdiFolderOpen} title="Open download folder" tooltipSide="bottom" onClick={() => openDownloadDir()}/>
				<IconButton icon={isWindowPinned ? mdiPinOff : mdiPin} title={isWindowPinned ? 'Unpin menu' : 'Pin menu'} tooltipSide="bottom" onClick={onPinWindowButtonClicked}/>
				<IconButton icon={mdiCog} title="Settings" tooltipSide="bottom" onClick={() => window.ipc.invoke('settings<-show-ui')}/>
			</div>
		</header>
	);
};
