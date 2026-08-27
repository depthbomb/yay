import type { HTTPClientOptions } from './HttpClientOptions';

export type CreateHTTPClientOptions = Omit<HTTPClientOptions, 'name'>;
