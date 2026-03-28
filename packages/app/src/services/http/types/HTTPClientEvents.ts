import type { URLLike } from '@depthbomb/common/url';

export type HTTPClientEvents = {
	request:  [requestID: string, url: URLLike, requestInit: RequestInit, retry: boolean];
	response: [requestID: string, url: URLLike, response: Response];
};
