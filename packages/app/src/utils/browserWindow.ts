import { shell } from 'electron';
import { EXTERNAL_URL_RULES } from '~/constants';
import type { HandlerDetails, WindowOpenHandlerResponse } from 'electron';

export function windowOpenHandler({ url }: HandlerDetails): WindowOpenHandlerResponse {
	const requestedUrl = new URL(url);
	if (EXTERNAL_URL_RULES.some(r => r(requestedUrl))) {
		shell.openExternal(url);
	}

	return { action: 'deny' };
}
