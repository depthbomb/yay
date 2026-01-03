import { cx } from 'cva';
import { Titlebar } from './Titlebar';
import { useEffect, useId, useState } from 'react';
import { useIpc, useTitle, useWindowFocus } from '~/hooks';
import type { FC, PropsWithChildren } from 'react';

export interface IWindowShellProps extends PropsWithChildren {
	windowName: string;
	title?: string;
	minimizeButton?: boolean;
	maximizeButton?: boolean;
	className?: string;
}

export const WindowShell: FC<IWindowShellProps> = ({
	windowName,
	title = '',
	minimizeButton = true,
	maximizeButton = true,
	children,
	...props
}) => {
	useTitle(title);

	const [isFocused, setIsFocused]     = useState(true);
	const [isMaximized, setIsMaximized] = useState(false);
	const [onIsMaximized]               = useIpc('window->is-maximized');
	const [onIsUnmaximized]             = useIpc('window->is-unmaximized');

	useEffect(() => {
		const offIsMaximized   = onIsMaximized(() => setIsMaximized(true));
		const offIsUnmaximized = onIsUnmaximized(() => setIsMaximized(false));

		return () => {
			offIsMaximized();
			offIsUnmaximized();
		};
	}, [onIsMaximized, onIsUnmaximized]);

	useWindowFocus(
		() => setIsFocused(true),
		() => setIsFocused(false),
	);

	return (
		<div id={useId()} className={cx('relative flex flex-col justify-center h-screen w-screen border overflow-hidden', {
			'border-gray-950': isMaximized,
			'border-accent-500': isFocused,
			'border-gray-900': !isFocused
		})} {...props}>
			<Titlebar title={title} windowName={windowName} minimizeButton={minimizeButton} maximizeButton={maximizeButton}/>
			<main className="h-full overflow-hidden">{children}</main>
		</div>
	);
};
