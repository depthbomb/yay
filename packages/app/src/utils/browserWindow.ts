import { shell } from 'electron';
import type { HandlerDetails, WindowOpenHandlerResponse } from 'electron';

export function windowOpenHandler({ url }: HandlerDetails): WindowOpenHandlerResponse {
	const requestedUrl = new URL(url);
	if (requestedUrl.host === 'github.com' || requestedUrl.host.endsWith('electronjs.org')) {
		shell.openExternal(url);
	}

	return { action: 'deny' };
}
