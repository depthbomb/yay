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
