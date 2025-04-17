import type { HttpClientOptions } from './HttpClientOptions';

export type CreateHttpClientOptions = Omit<HttpClientOptions, 'name'>;
