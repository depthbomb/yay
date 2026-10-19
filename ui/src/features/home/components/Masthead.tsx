import { cx } from 'cva';
import { native } from '~/native';
import { Logo } from '~/components/Logo';
import { mdiCog, mdiFolderOpen } from '@mdi/js';
import { IconButton } from '~/components/IconButton';
import { RequestChannel } from '~/ipc/ipc.generated';
import { useThrottle, useModifierKey } from '~/hooks';

export const Masthead = () => {
	const holdingAlt      = useModifierKey('Alt');
	const holdingShift    = useModifierKey('Shift');
	const openDownloadDir = useThrottle(() => native.ipc.invoke(RequestChannel.MainOpenDownloadDir), 2_500);
	const togglePinned    = async () => {
		if (!__YAY_DEBUG__ || !holdingShift || !native.development) {
			return;
		}

		await native.ipc.invoke(RequestChannel.MainWindowTogglePinned);
	};

	const headerCss = cx(
		'pt-3 px-3 w-full flex items-center justify-between shrink-0',
		{
			'draggable': holdingAlt
		}
	);

	return (
		<header className={headerCss} onClick={() => togglePinned()}>
			<Logo type="lockup" className="w-15"/>
			<div className="flex space-x-0.5 shrink-0 z-10">
				<IconButton icon={mdiFolderOpen} title="Open download folder" tooltipSide="bottom" onClick={() => openDownloadDir()}/>
				<IconButton icon={mdiCog} title="Settings" tooltipSide="bottom" onClick={() => native.ipc.invoke(RequestChannel.SettingsShowUi)}/>
			</div>
		</header>
	);
};
