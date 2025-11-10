import clsx from 'clsx';
import Icon from '@mdi/react';
import { TooltipV2 } from './TooltipV2';
import { memo, forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import type { TooltipSide } from './TooltipV2';

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
	icon: string;
	tooltipSide?: TooltipSide;
};

const baseCss = 'p-1 flex items-center rounded-full transition-all' as const;

export const IconButton = memo(forwardRef<HTMLButtonElement, IconButtonProps>(({ title, icon, tooltipSide, className, ...props }, ref) => {
	const css = clsx(
		baseCss,
		{
			'text-gray-500 cursor-not-allowed!': props.disabled,
			'text-gray-300 hover:text-white hover:bg-gray-600 active:bg-gray-700 ': !props.disabled,
		},
		className
	);

	return (
		<TooltipV2 content={title!} side={tooltipSide} showArrow={false}>
			<button
				ref={ref}
				className={css}
				{...props}
				type="button"
			>
				<Icon path={icon} className="size-4"/>
			</button>
		</TooltipV2>
	);
}));
