import { cx } from 'cva';
import { Logo } from './Logo';
import { useState, useEffect } from 'react';
import { useIpc, useWindowFocus } from '~/hooks';
import { TitlebarButton } from './TitlebarButton';
import type { FC } from 'react';

export interface ITitlebarProps {
	windowName: string;
	title?: string;
	minimizeButton?: boolean;
	maximizeButton?: boolean;
	showIcon?: boolean;
}

export const Titlebar: FC<ITitlebarProps> = ({ windowName, title, minimizeButton = true, maximizeButton = true, showIcon = true }) => {
	const [focused, setFocused]         = useState(true);
	const [isMaximized, setIsMaximized] = useState(false);
	const [onWindowMaximized]           = useIpc('window->is-maximized');
	const [onWindowRestored]            = useIpc('window->is-unmaximized');

	useWindowFocus(
		() => setFocused(true),
		() => setFocused(false)
	);

	useEffect(() => {
		const offMaximized = onWindowMaximized(() => setIsMaximized(true));
		const offRestored  = onWindowRestored(()  => setIsMaximized(false));

		return () => {
			offMaximized();
			offRestored();
		};
	}, []);

	return (
		<div className="w-full h-8 flex items-center">
			{showIcon && (
				<div className="size-8 flex items-center justify-center shrink-0 draggable">
					<Logo type="icon" className="size-4"/>
				</div>
			)}
			{title && <p className={cx('min-w-max h-8 leading-8 font-os text-xs draggable', focused ? 'opacity-100' : 'opacity-70')}>{title}</p>}
			<span className="size-full draggable"/>
			{minimizeButton && <TitlebarButton onClick={() => window.ipc.invoke('window<-minimize', windowName)} type="minimize"/>}
			{maximizeButton && <TitlebarButton onClick={() => window.ipc.invoke('window<-maximize', windowName)} type={isMaximized ? 'restore' : 'maximize'}/>}
			<TitlebarButton onClick={() => window.ipc.invoke('window<-close', windowName)} type="close"/>
		</div>
	);
};
