import logo from '~/assets/img/logo.svg';
import { TitlebarButton } from './TitlebarButton';
import { FC } from 'react';

type TitlebarProps = {
	title?: string;
	showIcon?: boolean;
};

export const Titlebar: FC<TitlebarProps> = ({ title, showIcon = true }) => {
	return (
		<div className="absolute top-0 pt-[1px] pr-[1px] pl-3 w-full h-8 flex items-center">
			{showIcon && <img src={logo} className="mr-2 w-4 h-8" draggable="false"/>}
			{title && <p className="min-w-max h-8 leading-8 text-xs draggable">{title}</p>}
			<span className="w-full h-full draggable"/>
			<TitlebarButton onClick={() => window.api.minimizeWindow('setup')} type="minimize"/>
			<TitlebarButton onClick={() => window.api.cancelSetup()} type="close"/>
		</div>
	);
};
