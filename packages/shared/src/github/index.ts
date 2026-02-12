export type GitHubReleaseAsset = {
	name: string;
	browser_download_url: string;
	size: number;
	digest?: string;
};

export type GitHubRelease = {
	tag_name: string;
	prerelease: boolean;
	body_html: string | null;
	assets: GitHubReleaseAsset[];
};

export type GitHubCommitUser = {
	login: string;
	avatar_url: string;
};

export type GitHubCommit = {
	sha: string;
	html_url: string;
	author: GitHubCommitUser | null;
	commit: {
		message: string;
	};
};
