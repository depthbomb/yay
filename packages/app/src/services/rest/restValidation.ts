import { timingSafeEqual } from 'node:crypto';

export const LOCAL_API_HOSTNAME = '127.0.0.1';

export const isAllowedLocalApiHost = (host: string | undefined, port: number) => {
	const normalized = host?.toLowerCase();
	return normalized === `${LOCAL_API_HOSTNAME}:${port}` || normalized === `localhost:${port}`;
};

export const isValidBearerToken = (candidate: string, expectedToken: string) => {
	const actual   = Buffer.from(candidate);
	const expected = Buffer.from(expectedToken);

	return actual.length === expected.length && timingSafeEqual(actual, expected);
};
