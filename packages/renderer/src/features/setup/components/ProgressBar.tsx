import { cx, cva } from 'cva';
import type { FC } from 'react';
import type { VariantProps } from 'cva';

export interface IProgressBarProps extends VariantProps<typeof progressBar> {
	value: number;
	className?: string;
}

const progressBar = cva({
	base: 'absolute inset-0 rounded-r-full',
	variants: {
		state: {
			indeterminate: 'w-full! bg-accent-500 animate-pulse',
			active: 'bg-accent-500',
			done: 'w-full! bg-lime-500',
		}
	}
});

export const ProgressBar: FC<IProgressBarProps> = ({ state, value, className }) => {
	return (
		<div className={cx('relative h-2.5 bg-gray-800 rounded-full overflow-hidden', className)}>
			<div className={progressBar({ state })} style={{ width: `${value}%` }}/>
		</div>
	);
};
