export const isAllowedExternalURL = (url: URL) => {
	if (url.protocol !== 'https:') {
		return false;
	}

	return url.hostname === 'github.com'
		|| url.hostname === 'electronjs.org'
		|| url.hostname.endsWith('.electronjs.org');
};
