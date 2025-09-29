export function cache(ttlMs: number) {
	return function <T extends object>(value: (this: T, ...args: any[]) => any, context: ClassMethodDecoratorContext<T>) {
		const cache = new WeakMap<object, { value: any; expiry: number }>();

		return function (this: T, ...args: any[]) {
			const now = Date.now();
			const entry = cache.get(this);

			if (entry && entry.expiry > now) {
				return entry.value;
			}

			const result = value.apply(this, args);

			cache.set(this, {
				value: result,
				expiry: now + ttlMs,
			});

			return result;
		};
	};
}

