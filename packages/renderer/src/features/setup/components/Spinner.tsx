import { forwardRef } from 'react';
import css from '../css/spinner.module.css';
import type { SVGAttributes } from 'react';

type SpinnerProps = SVGAttributes<SVGElement> & {
	lineWidth?: number;
};

export const Spinner = forwardRef<SVGElement, SpinnerProps>(({ lineWidth, className, ...props }, _) => {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" className={className} {...props}>
			<g className={css.spinner}>
				<circle cx="12" cy="12" r="9.5" fill="none" strokeWidth={lineWidth ?? 3}></circle>
			</g>
		</svg>
	);
});
