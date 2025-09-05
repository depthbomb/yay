/**
 * Creates a function that calls the given function only once.
 *
 * @param fn Function to be called only once
 * @returns A new function that calls the original function only once
 */
export function once<T extends (...args: any[]) => any>(fn: T): T {
	let called = false;
	let result: ReturnType<T>;

	return ((...args: Parameters<T>) => {
		if (!called) {
			result = fn(...args);
			called = true;
		}

		return result;
	}) as T;
}
