import { TitlebarButton } from './TitlebarButton';

export const Titlebar = () => {
	return (
		<div className="absolute top-0 pt-[1px] pr-[1px] w-full h-8 flex items-center">
			<span className="w-full h-full draggable"/>
			<TitlebarButton onClick={() => window.api.minimizeWindow('setup')} type="minimize"/>
			<TitlebarButton onClick={() => window.api.cancelSetup()} type="close"/>
		</div>
	);
};
