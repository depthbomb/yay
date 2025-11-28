import { cx } from 'cva';
import { useState } from 'react';
import logo from '~/assets/img/logo.svg';
import { useWindowFocus } from '~/hooks';
import { TitlebarButton } from './TitlebarButton';
import type { FC } from 'react';

export interface ITitlebarProps {
	title?: string;
	showIcon?: boolean;
}

export const Titlebar: FC<ITitlebarProps> = ({ title, showIcon = true }) => {
	const [focused, setFocused] = useState(true);

	useWindowFocus(
		() => setFocused(true),
		() => setFocused(false)
	);

	return (
		<div className="w-full h-8 flex items-center bg-linear-to-b from-black/50 to-transparent">
			{showIcon && (
				<div className="size-8 flex items-center justify-center shrink-0 draggable">
					<img src={logo} className="size-4" width="16" height="16" draggable="false"/>
				</div>
			)}
			{title && <p className={cx('min-w-max h-8 leading-8 font-os text-xs draggable', focused ? 'opacity-100' : 'opacity-70')}>{title}</p>}
			<span className="size-full draggable"/>
			<TitlebarButton onClick={() => window.ipc.invoke('window<-minimize')} type="minimize"/>
			<TitlebarButton onClick={() => window.ipc.invoke('setup<-cancel')} type="close"/>
		</div>
	);
};
