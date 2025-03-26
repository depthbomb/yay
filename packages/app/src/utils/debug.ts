/**
 * Logs to the console only in development mode
 */
export function debugLog(message?: string, ...optionalParams: any[]) {
	if (import.meta.env.DEV) {
		console.log(message, ...optionalParams);
	}
}
