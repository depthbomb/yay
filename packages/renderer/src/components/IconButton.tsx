import clsx from 'clsx';
import Icon from '@mdi/react';
import { Tooltip } from './Tooltip';
import { memo, forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
	tooltipPosition: 'top' | 'left' | 'bottom' | 'right';
	icon: string;
	to?: string;
};

const baseCss = 'p-1 flex items-center rounded-full transition-all' as const;

export const IconButton = memo(forwardRef<HTMLButtonElement, IconButtonProps>(({ title, tooltipPosition, icon, className, ...props }, ref) => {
	const css = clsx(
		baseCss,
		{
			'text-gray-500 cursor-not-allowed!': props.disabled,
			'text-gray-300 hover:text-white hover:bg-gray-600 active:bg-gray-700 ': !props.disabled,
		},
		className
	);

	return (
		<Tooltip content={title} position={tooltipPosition}>
			<button
				ref={ref}
				className={css}
				{...props}
				type="button"
			>
				<Icon path={icon} className="size-4"/>
			</button>
		</Tooltip>
	);
}));
