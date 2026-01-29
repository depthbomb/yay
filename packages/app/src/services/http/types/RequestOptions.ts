import type { QueryObject } from '@depthbomb/common/urllib';

export type RequestOptions = RequestInit & { query?: QueryObject };
