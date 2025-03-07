export type DownloadOptions = {
	signal: AbortSignal;
	onProgress?: (progress: number) => void;
};
