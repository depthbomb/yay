import { cva } from 'cva';
import Icon from '@mdi/react';
import { forwardRef } from 'react';
import { TooltipV2 } from './TooltipV2';
import type { VariantProps } from 'cva';
import type { TooltipSide } from './TooltipV2';
import type { ButtonHTMLAttributes } from 'react';

export interface IIconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'>, VariantProps<typeof iconButton> {
	icon: string;
	tooltipSide?: TooltipSide;
};

const iconButton = cva({
	base: 'p-1 flex items-center rounded-full transition-all',
	variants: {
		disabled: {
			false: 'text-gray-300 hover:text-white hover:bg-gray-600 active:bg-gray-700',
			true: 'text-gray-500 cursor-not-allowed'
		}
	},
	defaultVariants: {
		disabled: false
	}
});

export const IconButton = forwardRef<HTMLButtonElement, IIconButtonProps>(({ title, icon, tooltipSide, disabled, className, ...props }, ref) => {
	return (
		<TooltipV2 content={title!} side={tooltipSide} showArrow={false}>
			<button
				ref={ref}
				className={iconButton({ disabled, className })}
				disabled={disabled}
				{...props}
				type="button"
			>
				<Icon path={icon} className="size-4"/>
			</button>
		</TooltipV2>
	);
});
