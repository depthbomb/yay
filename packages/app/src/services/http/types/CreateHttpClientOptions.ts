import type { HTTPClientOptions } from './HTTPClientOptions';

export type CreateHTTPClientOptions = Omit<HTTPClientOptions, 'name'>;
