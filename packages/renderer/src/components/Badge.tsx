import { cva } from 'cva';
import type { VariantProps } from 'cva';
import type { FC, HTMLAttributes } from 'react';

export interface IBadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badge> {
	label: string;
}

const badge = cva({
	base: 'inline-flex items-center justify-center py-px px-1.5 text-[10px] font-mono border rounded-full',
	variants: {
		type: {
			success: 'text-green-400 bg-green-950 border-green-400',
			warning: 'text-yellow-400 bg-yellow-950 border-yellow-400',
			danger: 'text-red-400 bg-red-950 border-red-400',
			info: 'text-sky-400 bg-sky-950 border-sky-400'
		}
	}
});

export const Badge: FC<IBadgeProps> = ({ type, label, className, ...props }) => {
	return (
		<span className={badge({ type, className })} {...props}>
			{label}
		</span>
	);
};
