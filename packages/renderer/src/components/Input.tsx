import { cva, compose } from 'cva';
import { forwardRef } from 'react';
import type { VariantProps } from 'cva';
import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react';

export interface ITextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>, VariantProps<typeof base> {}
export interface ISelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'>, VariantProps<typeof base> {}

const textInputBase = cva({
	base: 'placeholder:text-gray-400 hover:placeholder:text-gray-300 focus:placeholder:text-gray-300 read-only:text-gray-400 read-only:cursor-default'
});

const base = cva({
	base: 'py-1 px-3 text-lg bg-gray-700 border border-gray-600 rounded hover:bg-gray-600 focus:bg-gray-700 focus:border-brand-600',
	variants: {
		size: {
			sm: 'px-2 text-sm rounded-sm',
			default: null,
		}
	},
	defaultVariants: {
		size: 'default'
	}
});

const textInput = compose(base, textInputBase);

export const TextInput = forwardRef<HTMLInputElement, ITextInputProps>(({ size, className, ...props }, ref) => {
	return (
		<input ref={ref} className={textInput({ size, className })} {...props}/>
	);
});

export const Select = forwardRef<HTMLSelectElement, ISelectProps>(({ size, className, children, ...props }, ref) => {
	return (
		<select ref={ref} className={base({ size, className })} {...props}>
			{children}
		</select>
	);
});
