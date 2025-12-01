import { cva } from 'cva';
import { forwardRef } from 'react';
import type { VariantProps } from 'cva';
import type { ButtonHTMLAttributes } from 'react';

export interface IButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'>, VariantProps<typeof button> {}

const button = cva({
	base: 'inline-flex items-center justify-center shrink-0 shadow outline-offset-2 focus:outline-2',
	variants: {
		type: {
			accent: 'text-accent-500-contrast bg-accent-500 hover:bg-accent-600 active:bg-accent-700 focus:outline-accent-500/50',
			success: 'text-black bg-lime-500 hover:bg-lime-600 active:bg-lime-700 focus:outline-lime-500/50',
			warning: 'text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 focus:outline-orange-500/50',
			danger: 'text-white bg-red-500 hover:bg-red-600 active:bg-red-700 focus:outline-red-500/50',
			info: 'text-black bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700 focus:outline-cyan-500/50'
		},
		size: {
			sm: 'px-1.75 space-x-0.5 h-5 text-[10px] rounded-[3px]',
			default: 'px-2.5 space-x-1 h-6 text-xs rounded',
			lg: 'px-2.75 space-x-1 text-sm h-8 rounded',
			xl: 'px-3.5 space-x-1.5 h-8.5 text-lg rounded'
		},
		disabled: {
			false: 'cursor-pointer',
			true: 'opacity-50 cursor-not-allowed!'
		}
	},
	defaultVariants: {
		type: 'accent',
		size: 'default'
	}
});

export const Button = forwardRef<HTMLButtonElement, IButtonProps>(({ type, size, className, disabled, ...props }, ref) => {
	return (
		<button
			ref={ref}
			className={button({ type, size, disabled, className })}
			disabled={disabled}
			{...props}
			type="button"
		>{props.children}</button>
	);
});
