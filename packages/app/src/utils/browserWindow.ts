import { shell } from 'electron';
import type { HandlerDetails, WindowOpenHandlerResponse } from 'electron';

export function windowOpenHandler({ url }: HandlerDetails): WindowOpenHandlerResponse {
	const requestedUrl = new URL(url);
	if (requestedUrl.host === 'github.com') {
		/**
		 * Currently the only intended links to open in an external browser are
		 * for GitHub.
		 */
		shell.openExternal(url);
	}

	return { action: 'deny' };
}
