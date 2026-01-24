export interface IDownloadSession {
	id: string;
	url: string;
	audioOnly: boolean;

	progress: number;

	cancelled: boolean;
	success: boolean | null;

	startedAt?: number;
	finishedAt?: number;
}
