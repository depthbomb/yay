import type { FC, AnchorHTMLAttributes } from 'react';

interface IAnchorProps extends AnchorHTMLAttributes<HTMLAnchorElement> {}

export const Anchor: FC<IAnchorProps> = ({ className, ...props }) => {
	return <a {...props} className={`space-x-0.5 inline-flex items-center text-accent-500 hover:text-accent-400 active:text-accent-600 ${className}`}>
		{props.children}
	</a>
};
