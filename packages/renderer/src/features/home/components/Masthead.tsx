import { cx } from 'cva';
import { SeasonalLogo } from './SeasonalLogo';
import { mdiCog, mdiFolderOpen } from '@mdi/js';
import { IconButton } from '~/components/IconButton';
import { useThrottle, useModifierKey } from '~/hooks';

export const Masthead = () => {
	const openDownloadDir = useThrottle(() => window.ipc.invoke('main<-open-download-dir'), 2_500);
	const holdingAlt      = useModifierKey('Alt');

	const headerCss = cx(
		'pt-3 px-3 w-full flex items-center shrink-0',
		{
			'draggable': holdingAlt
		}
	);

	return (
		<header className={headerCss}>
			<SeasonalLogo/>
			<div className="flex space-x-0.5 shrink-0 z-10">
				<IconButton icon={mdiFolderOpen} title="Open download folder" tooltipSide="bottom" onClick={() => openDownloadDir()}/>
				<IconButton icon={mdiCog} title="Settings" tooltipSide="bottom" onClick={() => window.ipc.invoke('settings<-show-ui')}/>
			</div>
		</header>
	);
};
