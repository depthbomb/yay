import { cva } from 'cva';
import { Icon } from '@mdi/react';
import { TooltipV2 } from './TooltipV2';
import type { VariantProps } from 'cva';
import type { TooltipSide } from './TooltipV2';
import type { ButtonHTMLAttributes } from 'react';

export interface IIconButtonProps
	extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'>,
		VariantProps<typeof iconButton> {
	icon: string;
	tooltipSide?: TooltipSide;
}

const iconButton = cva({
	base: 'p-1 flex items-center rounded transition-[color,background-color]',
	variants: {
		disabled: {
			false:
				'text-gray-300 outline-offset-2 outline-accent-500/50 hover:text-white hover:bg-gray-800 active:bg-gray-900 focus:outline-2',
			true: 'text-gray-500 cursor-not-allowed'
		}
	},
	defaultVariants: {
		disabled: false
	}
});

export const IconButton = ({
	title,
	icon,
	tooltipSide,
	disabled,
	className,
	...props
}: IIconButtonProps) => {
	return (
		<TooltipV2 content={title!} side={tooltipSide} showArrow={false}>
			<button
				className={iconButton({ disabled, className })}
				disabled={disabled}
				{...props}
				type="button"
			>
				<Icon path={icon} className="size-4" />
			</button>
		</TooltipV2>
	);
};
