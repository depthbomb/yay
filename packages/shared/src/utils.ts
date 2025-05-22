export function isValidHttpUrl(url: string): boolean {
	let inputUrl: URL;
	try {
		inputUrl = new URL(url);
	} catch {
		return false;
	}

	return url.startsWith('http://') || url.startsWith('https://');
}

export async function pollUntil(fn: () => boolean, duration: number) {
	return new Promise<void>(res => {
		while (!fn()) {
			res();
		}
	});
}
