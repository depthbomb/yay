export function isValidURL(url: string): boolean {
	try {
		new URL(url);
	} catch {
		return false;
	}

	return url.startsWith('http://') || url.startsWith('https://');
}
