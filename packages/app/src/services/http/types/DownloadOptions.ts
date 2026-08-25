export type DownloadOptions = {
	signal: AbortSignal;
	maxBytes?: number;
	onProgress?: (progress: number) => void;
};
