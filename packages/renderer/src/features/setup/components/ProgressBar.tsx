import { cx } from 'cva';
import type { FC } from 'react';

export interface IProgressBarProps {
	state: 'indeterminate' | 'active' | 'done';
	value: number;
	className?: string;
}

export const ProgressBar: FC<IProgressBarProps> = ({ state, value, className }) => {
	return (
		<div className={cx('relative h-2.5 bg-gray-800 rounded-full overflow-hidden', className)}>
			<div className={cx(
				'absolute inset-0 rounded-r-full',
				{
					'w-full! bg-accent-500 animate-pulse': state === 'indeterminate',
					'bg-accent-500': state === 'active',
					'w-full! bg-lime-500': state === 'done'
				}
			)} style={{ width: `${value}%` }}/>
		</div>
	);
};
