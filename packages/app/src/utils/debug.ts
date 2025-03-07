export function debugLog(message?: string, ...optionalParams: any[]) {
	if (import.meta.env.DEV) {
		console.debug(message, ...optionalParams);
	}
}
