import { connectNativeClient } from './ipc/native-client';
import type { IpcTransport } from './ipc/ipc-client';

declare global {
	interface Window {
		chrome: {
			webview: IpcTransport;
		};
	}
}

// Importers wait for bootstrap before they can use the native client.
export const native = await connectNativeClient(window.chrome.webview, __YAY_DEBUG__);
