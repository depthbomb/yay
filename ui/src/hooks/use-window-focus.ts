import { useEffect } from 'react';

type ListenerFn = () => void;

export const useWindowFocus = (onFocus: ListenerFn, onBlur: ListenerFn) => {
	useEffect(() => {
		window.addEventListener('focus', onFocus);
		window.addEventListener('blur', onBlur);

		return () => {
			window.removeEventListener('focus', onFocus);
			window.removeEventListener('blur', onBlur);
		};
	}, [onFocus, onBlur]);
};
