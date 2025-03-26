import clsx from 'clsx';
import { memo, forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
	size?: 'sm' | 'lg' | 'xl';
	variant?: 'normal' | 'brand' | 'success' | 'info' | 'warning' | 'danger';
};

const baseCss = 'flex items-center justify-center shrink-0 transition-colors' as const;

export const Button = memo(forwardRef<HTMLButtonElement, ButtonProps>(({ size, variant, className, ...props }, ref) => {
	const css = clsx(
		baseCss,
		{
			// Variant classes
			'text-black bg-white hover:bg-gray-300 active:bg-gray-400': variant === 'normal' || !variant,
			'text-white bg-brand-500 hover:bg-brand-600 active:bg-brand-700': variant === 'brand',
			'text-black bg-lime-500 hover:bg-lime-600 active:bg-lime-700': variant === 'success',
			'text-black bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700': variant === 'info',
			'text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700': variant === 'warning',
			'text-white bg-red-500 hover:bg-red-600 active:bg-red-700': variant === 'danger',
			// Size classes
			'px-1.5 space-x-0.5 h-5 text-[10px] rounded-[3px]': size === 'sm',
			'px-2 space-x-1 h-6 text-xs rounded': !size,
			'px-2.5 space-x-1 text-sm h-8 rounded': size === 'lg',
			'px-3 space-x-1.5 h-8.5 text-lg rounded': size === 'xl',
			// Other
			'opacity-50 cursor-not-allowed!': props.disabled,
			'cursor-pointer': !props.disabled,
		},
		className
	);

	return (
		<button
			ref={ref}
			className={css}
			{...props}
			type="button"
		>{props.children}</button>
	);
}));
