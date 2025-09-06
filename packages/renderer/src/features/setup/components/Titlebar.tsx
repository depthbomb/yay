import clsx from 'clsx';
import { useState } from 'react';
import logo from '~/assets/img/logo.svg';
import { TitlebarButton } from './TitlebarButton';
import { useWindowFocus } from '~/hooks/useWindowFocus';
import type { FC } from 'react';

type TitlebarProps = {
	title?: string;
	showIcon?: boolean;
};

export const Titlebar: FC<TitlebarProps> = ({ title, showIcon = true }) => {
	const [focused, setFocused] = useState(true);

	useWindowFocus(
		() => setFocused(true),
		() => setFocused(false)
	);

	return (
		<div className="absolute top-0 pt-[1px] pr-[1px] w-full h-8 flex items-center">
			{showIcon && (
				<div className="size-8 flex items-center justify-center shrink-0 draggable">
					<img src={logo} className="size-4" width="16" height="16" draggable="false"/>
				</div>
			)}
			{title && <p className={clsx('min-w-max h-8 leading-8 text-xs draggable', focused ? 'text-white' : 'text-gray-300')}>{title}</p>}
			<span className="size-full draggable"/>
			<TitlebarButton onClick={() => window.ipc.invoke('window<-minimize', 'setup')} type="minimize"/>
			<TitlebarButton onClick={() => window.ipc.invoke('setup<-cancel')} type="close"/>
		</div>
	);
};
