export type ReleaseAsset = {
	url: string;
	id: number;
	node_id: string;
	name: string;
	label: string;
	content_type: string;
	state: string; // TODO make enum string?
	size: number;
	download_count: number;
	created_at: string;
	updated_at: string;
	browser_download_url: string;
};
