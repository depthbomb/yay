import { useEffect } from 'react';
import type { FC } from 'react';

export interface ITitleProps {
	children: string;
}

export const Title: FC<ITitleProps> = ({ children }) => {
	useEffect(() => {
		document.title = children;
	}, [children]);

	return null;
}
