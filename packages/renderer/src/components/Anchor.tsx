import { memo, useId, forwardRef } from 'react';
import type { AnchorHTMLAttributes } from 'react';

type AnchorProps = AnchorHTMLAttributes<HTMLAnchorElement>;

export const Anchor = memo(forwardRef<HTMLAnchorElement, AnchorProps>(({ className, ...props }, ref) => {
	const id = useId();

	return <a id={props.id ?? id} ref={ref} {...props} className={`space-x-0.5 inline-flex items-center text-brand-500 hover:text-brand-400 active:text-brand-600 ${className}`}>
		{props.children}
	</a>
}));
