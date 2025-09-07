import { useEffect } from 'react';

export function useTitle(title: string, options?: { restoreOnUnmount?: boolean }) {
	useEffect(() => {
		const previousTitle = document.title;

		document.title = title;

		return () => {
			if (options?.restoreOnUnmount) {
				document.title = previousTitle;
			}
		};
	}, [title, options]);
}
