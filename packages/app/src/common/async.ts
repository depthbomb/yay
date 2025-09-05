/**
 * Returns a promise after the provided {@link ms} has passed
 * @param ms The number of milliseconds to wait
 */
export function timeout(ms: number) {
	return new Promise((res) => setTimeout(res, ms));
}

/**
 * Rejects a promise after the provided {@link ms} has passed
 * @param ms The number of milliseconds to wait
 */
export function rejectionTimeout(ms: number) {
	return new Promise((_, rej) => setTimeout(rej, ms));
}

/**
 * Polls until the provided condition is met, or the timeout is exceeded.
 *
 * @param condition A function that returns a boolean or a promise that resolves to a boolean
 * @param interval The interval in milliseconds to wait between checks
 * @param timeoutMs The maximum time in milliseconds to wait before throwing an error
 */
export async function pollUntil(condition: () => boolean | Promise<boolean>, interval = 100, timeoutMs = 5_000) {
	const start = Date.now();
	while (!(await condition())) {
		if (Date.now() - start > timeoutMs) {
			throw new Error('Timeout exceeded');
		}

		await timeout(interval);
	}
}

/**
 * Wraps a promise with a timeout. If the promise does not resolve within the specified time, an error is thrown.
 *
 * @param promise The promise to wrap with a timeout
 * @param ms The number of milliseconds to wait before timing out
 *
 * @returns The result of the promise if it resolves before the timeout, otherwise throws an error
 */
export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	return Promise.race([
		promise,
		new Promise<never>((_, rej) =>
			setTimeout(() => rej(new Error('Operation timed out')), ms)
		),
	]);
}

/**
 * Waits for all promises to settle and returns an array of successful results.
 *
 * @param promises An array of promises to wait for
 * @returns A promise that resolves to an array of successful results
 */
export async function allSettledSuccessful<T>(promises: Promise<T>[]): Promise<T[]> {
	const results: PromiseSettledResult<T>[] = await Promise.allSettled(promises);
	return results
		.filter((r): r is PromiseFulfilledResult<T> => r.status === 'fulfilled')
		.map((r) => r.value);
}

/**
 * Executes an array of asynchronous tasks sequentially.
 *
 * @param tasks An array of functions that return promises
 * @returns A promise that resolves to an array of results from the input tasks
 */
export async function sequential<T>(tasks: (() => Promise<T>)[]): Promise<T[]> {
	const results: T[] = [];
	for (const task of tasks) {
		results.push(await task());
	}

	return results;
}
