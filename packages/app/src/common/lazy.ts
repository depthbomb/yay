export function lazy<T>(factory: () => T): () => T {
	let cached: T | undefined;
	let initialized = false;

	return () => {
		if (!initialized) {
			cached = factory();
			initialized = true;
		}

		return cached!;
	};
}

export function lazyAsync<T>(factory: () => Promise<T>): () => Promise<T> {
	let promise: Promise<T> | undefined;

	return () => {
		if (!promise) {
			promise = factory();
		}

		return promise;
	};
}

export function resettableLazy<T>(factory: () => T) {
	let cached: T | undefined;
	let initialized = false;

	function get(): T {
		if (!initialized) {
			cached = factory();
			initialized = true;
		}
		return cached!;
	}

	function reset() {
		initialized = false;
		cached = undefined;
	}

	return { get, reset };
}
