import { forwardRef } from 'react';
import type { AnchorHTMLAttributes } from 'react';

export const Anchor = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement>>(({ className, ...props }, ref) => {
	return <a ref={ref} {...props} className={`space-x-0.5 inline-flex items-center text-brand-500 hover:text-brand-400 active:text-brand-600 ${className}`}>
		{props.children}
	</a>
});
