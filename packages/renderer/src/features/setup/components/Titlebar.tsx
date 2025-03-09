import logo from '~/assets/img/logo.svg';
import { TitlebarButton } from './TitlebarButton';
import type { FC } from 'react';

type TitlebarProps = {
	title?: string;
	showIcon?: boolean;
};

export const Titlebar: FC<TitlebarProps> = ({ title, showIcon = true }) => {
	return (
		<div className="absolute top-0 pt-[1px] pr-[1px] w-full h-8 flex items-center">
			{showIcon && (
				<div className="flex items-center justify-center w-12 h-8 draggable">
					<img src={logo} className="size-4" width="16" height="16" draggable="false"/>
				</div>
			)}
			{title && <p className="min-w-max h-8 leading-8 text-xs draggable">{title}</p>}
			<span className="w-full h-full draggable"/>
			<TitlebarButton onClick={() => window.api.minimizeWindow('setup')} type="minimize"/>
			<TitlebarButton onClick={() => window.api.cancelSetup()} type="close"/>
		</div>
	);
};
