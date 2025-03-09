import clsx from 'clsx';
import { forwardRef } from 'react';
import { useNavigate } from 'react-router';
import type { ButtonHTMLAttributes } from 'react';

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
	to?: string;
	size?: 'sm' | 'lg' | 'xl';
	variant?: 'normal' | 'success' | 'info' | 'warning' | 'danger';
};

const baseCss = 'flex items-center justify-center transition-colors';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ to, size, variant, className, onClick, ...props }, ref) => {
	if (to && onClick) throw new Error('`to` and `onClick` component properties are mutually exclusive');
	if (!to && !onClick) throw new Error('Component must have either `to` or `onClick` property');

	const navigate = useNavigate();
	const css = clsx(
		baseCss,
		{
			// Variant classes
			'text-black bg-white hover:bg-gray-300 active:bg-gray-400': variant === 'normal' || !variant,
			'text-black bg-lime-500 hover:bg-lime-600 active:bg-lime-700': variant === 'success',
			'text-black bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700': variant === 'info',
			'text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700': variant === 'warning',
			'text-white bg-red-500 hover:bg-red-600 active:bg-red-700': variant === 'danger',
			// Size classes
			'px-1.5 space-x-0.5 h-5 text-[10px] rounded-[3px]': size === 'sm',
			'px-2 space-x-1 h-6 text-xs rounded': !size,
			'px-2.5 space-x-1 text-sm h-8 rounded': size === 'lg',
			'px-3 space-x-1.5 h-8.5 text-lg rounded': size === 'xl',
		},
		className
	);

	return (
		<button
			ref={ref}
			{...(to && { onClick: () => navigate(to) })}
			{...(onClick && { onClick })}
			className={css}
			{...props}
			type="button"
		>{props.children}</button>
	);
});
