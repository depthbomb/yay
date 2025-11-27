import { cva } from 'cva';
import { memo, forwardRef } from 'react';
import type { VariantProps } from 'cva';
import type { ButtonHTMLAttributes } from 'react';

const button = cva({
	base: 'flex items-center justify-center shrink-0 transition-colors',
	variants: {
		type: {
			default: 'text-black bg-white hover:bg-gray-300 active:bg-gray-400',
			brand: 'text-white bg-brand-500 hover:bg-brand-600 active:bg-brand-700',
			success: 'text-black bg-lime-500 hover:bg-lime-600 active:bg-lime-700',
			warning: 'text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700',
			danger: 'text-white bg-red-500 hover:bg-red-600 active:bg-red-700',
			info: 'text-black bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700'
		},
		size: {
			sm: 'px-1.5 space-x-0.5 h-5 text-[10px] rounded-[3px]',
			default: 'px-2 space-x-1 h-6 text-xs rounded',
			lg: 'px-2.5 space-x-1 text-sm h-8 rounded',
			xl: 'px-3 space-x-1.5 h-8.5 text-lg rounded'
		},
		disabled: {
			false: 'cursor-pointer',
			true: 'opacity-50 cursor-not-allowed!'
		}
	},
	defaultVariants: {
		type: 'default',
		size: 'default'
	}
});

export interface IButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'>, VariantProps<typeof button> {}

export const Button = memo(forwardRef<HTMLButtonElement, IButtonProps>(({ type, size, className, disabled, ...props }, ref) => {
	return (
		<button
			ref={ref}
			className={button({ type, size, disabled, className })}
			disabled={disabled}
			{...props}
			type="button"
		>{props.children}</button>
	);
}));
