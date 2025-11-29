import { useRef, useCallback } from 'react';

type UseThrottleFnArg = (...args: unknown[]) => unknown;

export const useThrottle = (fn: UseThrottleFnArg, delay: number) => {
	const lastCall    = useRef(0);
	const throttledFn = useCallback((...args: Parameters<UseThrottleFnArg>) => {
		const now = Date.now();
		if (now - lastCall.current >= delay) {
			fn(...args);
			lastCall.current = now;
		}
	}, [fn, delay]);

	return throttledFn;
};
