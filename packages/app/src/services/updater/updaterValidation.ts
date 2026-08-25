import isVersionGreaterThan from 'semver/functions/gt';
import isValidVersion from 'semver/functions/valid';
import type { GitHubRelease, GitHubReleaseAsset } from 'shared';

export const isNewerStableRelease = (release: GitHubRelease, currentVersion: string) => (
	!release.draft
	&& !release.prerelease
	&& Boolean(isValidVersion(release.tag_name))
	&& Boolean(isValidVersion(currentVersion))
	&& isVersionGreaterThan(release.tag_name, currentVersion)
);

export const getAssetSHA256 = (asset: GitHubReleaseAsset) => {
	const match = /^sha256:([a-fA-F0-9]{64})$/i.exec(asset.digest?.trim() ?? '');
	return match?.[1].toLowerCase() ?? null;
};

export const parseChecksumText = (checksumText: string, installerName: string) => {
	for (const line of checksumText.split(/\r?\n/)) {
		const match = /^([a-fA-F0-9]{64})\s+\*?(.+)$/.exec(line.trim());
		if (match && match[2] === installerName) {
			return match[1].toLowerCase();
		}
	}

	return null;
};

export const isTrustedReleaseAssetURL = (input: string, owner: string, repo: string) => {
	try {
		const url = new URL(input);
		const releasePrefix = `/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/download/`;
		return url.protocol === 'https:'
			&& url.hostname === 'github.com'
			&& url.port === ''
			&& url.pathname.startsWith(releasePrefix);
	} catch {
		return false;
	}
};

export const isTrustedReleaseDownloadURL = (input: string) => {
	try {
		const url = new URL(input);
		return url.protocol === 'https:' && url.port === '' && (
			url.hostname === 'github.com'
			|| url.hostname === 'objects.githubusercontent.com'
			|| url.hostname === 'release-assets.githubusercontent.com'
		);
	} catch {
		return false;
	}
};
