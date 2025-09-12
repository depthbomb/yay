import type { RequestOptions } from './RequestOptions';

export type GETOptions = Omit<RequestOptions, 'method'>;
