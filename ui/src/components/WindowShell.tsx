import { cx } from 'cva';
import { useState } from 'react';
import { native } from '~/native';
import { Titlebar } from './Titlebar';
import { EventChannel } from '~/ipc/ipc.generated';
import { useTitle, useIPCEvent, useWindowFocus } from '~/hooks';
import type { FC, PropsWithChildren } from 'react';

export interface IWindowShellProps extends PropsWithChildren {
	windowName: string;
	title?: string;
	minimizeButton?: boolean;
	maximizeButton?: boolean;
	className?: string;
	titlebarClassName?: string;
}

export const WindowShell: FC<IWindowShellProps> = ({
	windowName,
	title = '',
	minimizeButton = true,
	maximizeButton = true,
	children,
	titlebarClassName,
	...props
}) => {
	useTitle(title);

	const [isFocused, setIsFocused]     = useState(true);
	const [isMaximized, setIsMaximized] = useState(false);

	useIPCEvent(EventChannel.WindowIsMaximized,   () => setIsMaximized(true));
	useIPCEvent(EventChannel.WindowIsUnmaximized, () => setIsMaximized(false));

	useWindowFocus(
		() => setIsFocused(true),
		() => setIsFocused(false),
	);

	return (
		<div className={cx('relative flex flex-col justify-center h-screen w-screen overflow-hidden', {
			'border': !native.isWindows11,
			'border-gray-950': isMaximized && !native.isWindows11,
			'border-accent-500': isFocused && !native.isWindows11,
			'border-gray-900': !isFocused && !native.isWindows11
		})} {...props}>
			<Titlebar
				className={titlebarClassName}
				title={title}
				windowName={windowName}
				minimizeButton={minimizeButton}
				maximizeButton={maximizeButton}
				focused={isFocused}
				isMaximized={isMaximized}
			/>
			<main className="h-full overflow-hidden">{children}</main>
		</div>
	);
};
