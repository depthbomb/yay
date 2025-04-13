import clsx from 'clsx';
import Icon from '@mdi/react';
import { Tooltip } from './Tooltip';
import { memo, forwardRef } from 'react';
import { useNavigate } from 'react-router';
import type { ButtonHTMLAttributes } from 'react';

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
	tooltipPosition: 'top' | 'left' | 'bottom' | 'right';
	icon: string;
	to?: string;
};

const baseCss = 'p-1 flex items-center rounded-full transition-all' as const;

export const IconButton = memo(forwardRef<HTMLButtonElement, IconButtonProps>(({ title, tooltipPosition, icon, to, className, onClick, ...props }, ref) => {
	if (to && onClick) throw new Error('`to` and `onClick` component properties are mutually exclusive');
	if (!to && !onClick) throw new Error('Component must have either `to` or `onClick` property');

	const navigate = useNavigate();
	const css = clsx(
		baseCss,
		{
			'text-gray-500 cursor-not-allowed!': props.disabled,
			'text-gray-300 hover:text-white hover:bg-gray-600 active:bg-gray-700 ': !props.disabled,
		},
		className
	);

	return (
		<Tooltip content={title} position={tooltipPosition}>
			<button
				ref={ref}
				{...(to && { onClick: () => navigate(to) })}
				{...(onClick && { onClick })}
				className={css}
				{...props}
				type="button"
			>
				<Icon path={icon} className="size-4"/>
			</button>
		</Tooltip>
	);
}));
