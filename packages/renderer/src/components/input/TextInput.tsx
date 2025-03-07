import clsx from 'clsx';
import { forwardRef } from 'react';
import { baseCss } from './base-styles';
import type { InputHTMLAttributes } from 'react';

type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
	size?: 'small' | 'normal';
};

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(({ className, size = 'normal', ...props }, ref) => {
	const css = clsx(
		baseCss,
		'read-only:text-gray-400',
		'read-only:cursor-default',
		{
			'px-2 text-sm rounded-sm': size === 'small',
		},
		className
	);

	return (
		<input ref={ref} className={css} {...props}/>
	);
});
