import type { RetryPolicy } from 'cockatiel';
import type { RequestOptions } from './RequestOptions';

export type GETOptions = Omit<RequestOptions, 'method'>;
