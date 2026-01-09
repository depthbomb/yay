import type { FC, ReactNode } from 'react';

export const Section: FC<{ title?: ReactNode; children: ReactNode; }> = ({ title, children }) => {
	return (
		<div className="space-y-3 flex flex-col items-start">
			{title && <h2 className="font-display">{title}</h2>}
			{children}
		</div>
	);
};
