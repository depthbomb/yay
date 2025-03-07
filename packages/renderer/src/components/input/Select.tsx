import clsx from 'clsx';
import { forwardRef } from 'react';
import { baseCss } from './base-styles';
import type { SelectHTMLAttributes } from 'react';

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
	size?: 'small' | 'normal';
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, size = 'normal', children, ...props }, ref) => {
	const css = clsx(
		baseCss,
		{
			'px-2 text-sm rounded-sm': size === 'small',
		},
		className
	);

	return (
		<select ref={ref} className={css} {...props}>
			{children}
		</select>
	);
});
