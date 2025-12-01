export function isValidURL(url: string): boolean {
	let inputURL: URL;
	try {
		inputURL = new URL(url);
	} catch {
		return false;
	}

	return url.startsWith('http://') || url.startsWith('https://');
}

export function typedEntries<T extends object>(obj: T) {
	return Object.entries(obj) as {
		[K in keyof T]: [K, T[K]];
	}[keyof T][];
}
