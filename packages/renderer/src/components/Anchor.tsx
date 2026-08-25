import type { FC, AnchorHTMLAttributes } from 'react';

type AnchorProps = AnchorHTMLAttributes<HTMLAnchorElement>;

export const Anchor: FC<AnchorProps> = ({ className, ...props }) => {
	return <a {...props} className={`space-x-0.5 inline-flex items-center text-accent-500 hover:text-accent-400 active:text-accent-600 ${className}`}>
		{props.children}
	</a>
};
