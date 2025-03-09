import clsx from 'clsx';
import Icon from '@mdi/react';
import { mdiCheck, mdiClose, mdiMinus } from '@mdi/js';
import { useState, useEffect, forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

type ToggleButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
	enabled: boolean;
};

export const ToggleButton = forwardRef<HTMLButtonElement, ToggleButtonProps>(({ enabled, onClick, className, ...props }, ref) => {
	const [isInitial, setIsInitial] = useState(true);
	const css = clsx(
		'flex flex-row items-center justify-center px-1.5 space-x-1 min-w-16 h-6 text-xs rounded',
		{
			'text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700': isInitial,
			'text-lime-950 bg-lime-500 hover:bg-lime-600 active:bg-lime-700': enabled,
			'bg-red-500 hover:bg-red-600 active:bg-red-700': !enabled,
		},
		className
	);

	useEffect(() => setIsInitial(false), []);

	return (
		<button ref={ref} className={css} onClick={onClick} {...props} type="button">
			<Icon path={isInitial ? mdiMinus : enabled ? mdiCheck : mdiClose} className="size-4"/>
			<span>{ isInitial ? '...' : enabled ? 'Enabled' : 'Disabled' }</span>
		</button>
	);
});
