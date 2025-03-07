import type { ReleaseAsset } from './ReleaseAsset';

export type Release = {
	url: string;
	assets_url: string;
	upload_url: string;
	html_url: string;
	id: number;
	node_id: string;
	tag_name: string;
	target_commitish: string;
	name: string;
	draft: boolean;
	prerelease: boolean;
	created_at: string;
	updated_at: string;
	published_at: string;
	assets: ReleaseAsset[];
	tarball_url: string;
	zipball_url: string;
	body: string;
};
