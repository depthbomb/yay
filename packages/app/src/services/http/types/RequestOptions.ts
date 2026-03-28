import type { QueryObject } from '@depthbomb/common/url';

export type RequestOptions = RequestInit & { query?: QueryObject };
