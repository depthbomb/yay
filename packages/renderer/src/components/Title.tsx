import { useEffect } from 'react';
import type { FC } from 'react';

type TitleProps = { children: string; };

export const Title: FC<TitleProps> = ({ children }) => {
	useEffect(() => {
		document.title = children;
	}, [children]);

	return null;
}
