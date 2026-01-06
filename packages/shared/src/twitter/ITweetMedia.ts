interface IVariant {
	bitrate?: number;
	content_type: string;
	url: string;
}

interface IVideoInfo {
	variants: IVariant[];
}

interface IMediaDetails {
	media_url_https: string;
	video_info?: IVideoInfo;
}

export interface ITweetMedia {
	mediaDetails: IMediaDetails[];
}
