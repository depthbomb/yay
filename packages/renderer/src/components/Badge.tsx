import clsx from 'clsx';
import type { FC } from 'react';

type BadgeProps = {
	label: string;
	type: 'success' | 'warning' | 'danger' | 'info';
};

export const Badge: FC<BadgeProps> = ({ label, type }) => {
	const css = clsx(
		'inline-flex items-center justify-center py-0.25 px-1.5 text-[10px] font-mono border rounded-full',
		{
			'text-green-400 bg-green-950 border-green-400': type === 'success',
			'text-yellow-400 bg-yellow-950 border-yellow-400': type === 'warning',
			'text-red-400 bg-red-950 border-red-400': type === 'danger',
			'text-sky-400 bg-sky-950 border-sky-400': type === 'info',
		}
	);

	return (
		<span className={css}>
			{label}
		</span>
	);
};
