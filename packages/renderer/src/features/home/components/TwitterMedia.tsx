import { useAtom } from 'jotai';
import { Icon } from '@mdi/react';
import { workingAtom } from '~/atoms/app';
import { useState, useEffect } from 'react';
import { Button } from '~/components/Button';
import { Spinner } from '~/components/SpinnerV2';
import { mdiAlert, mdiCheck, mdiTwitter, mdiDownload } from '@mdi/js';
import type { FC } from 'react';
import type { Nullable, ITweetMedia } from 'shared';

interface ITwitterMediaProps {
	tweetURL: string;
}

const enum EVariantDownloadState {
	Idle,
	Downloading,
	Downloaded,
	Error
}

const extractResolution = (url: string): string => {
	const match = url.match(/(\d+x\d+)/);
	return match ? match[1] : 'Unknown';
};

export const TwitterMedia: FC<ITwitterMediaProps> = ({ tweetURL }) => {
	const [loading, setLoading]               = useState(true);
	const [error, setError]                   = useState<string>();
	const [data, setData]                     = useState<Nullable<ITweetMedia>>(null);
	const [downloadStates, setDownloadStates] = useState<Record<string, EVariantDownloadState>>({});
	const [isWorking, setIsWorking]           = useAtom(workingAtom);

	useEffect(() => {
		let active = true;

		const fetchMediaInfo = async () => {
			setData(null);
			setError(undefined);
			setLoading(true);
			setDownloadStates({});

			try {
				const res = await window.ipc.invoke('twitter<-get-tweet-media-info', tweetURL);
				if (!active) {
					return;
				}

				if (res.isErr) {
					setError(res.error);
				} else {
					setData(res.data);
				}
			} catch (error) {
				if (active) {
					setError(error instanceof Error ? error.message : String(error));
				}
			} finally {
				if (active) {
					setLoading(false);
				}
			}
		};

		void fetchMediaInfo();

		return () => {
			active = false;
		};
	}, [tweetURL]);

	const setState = (url: string, state: EVariantDownloadState) => {
		setDownloadStates(prev => ({ ...prev, [url]: state }));
	};

	const tryDownload = async (url: string) => {
		setState(url, EVariantDownloadState.Downloading);
		setIsWorking(true);

		try {
			const res = await window.ipc.invoke('twitter<-download-media-url', url);
			setState(url, res.isErr ? EVariantDownloadState.Error : EVariantDownloadState.Downloaded);
		} catch (err) {
			setState(url, EVariantDownloadState.Error);
			console.error(err);
		} finally {
			setIsWorking(false);
		}
	};

	const isDisabled = (state: EVariantDownloadState)=> state === EVariantDownloadState.Downloading || state === EVariantDownloadState.Downloaded;

	const renderLabel = (state: EVariantDownloadState, resolution: string) => {
		switch (state) {
			case EVariantDownloadState.Downloading:
				return 'Downloading...';
			case EVariantDownloadState.Downloaded:
				return 'Downloaded';
			case EVariantDownloadState.Error:
				return `Retry ${resolution}`;
			default:
				return resolution;
		}
	};

	const renderIcon = (state: EVariantDownloadState) => {
		switch (state) {
			case EVariantDownloadState.Downloaded:
				return mdiCheck;
			case EVariantDownloadState.Error:
				return mdiAlert;
			default:
				return mdiDownload;
		}
	};

	if (error) {
		return (
			<div className="size-full flex flex-col">
				<p className="text-red-500">Error retrieving Tweet info: {error}</p>
			</div>
		);
	}

	return (
		<div className="space-y-3 size-full flex flex-col overflow-y-auto [scrollbar-width:thin]">
			<div className="mb-3 space-x-1.5 flex justify-center">
				<Icon path={mdiTwitter} className="size-6 text-[#55acee]"/>
				<span className="font-display">Twitter Video Downloader</span>
			</div>
			{loading ? (
				<div className="h-full flex items-center justify-center">
					<Spinner className="size-16"/>
				</div>
			) : data === null ? (
				<div className="h-full flex items-center justify-center">
					<p>Tweet doesn't contain any videos.</p>
				</div>
			) : data.mediaDetails.map(details => (
				<div key={details.media_url_https} className="relative p-3 flex items-center justify-between bg-gray-900 rounded border border-gray-800 shadow overflow-hidden">
					<img src={details.media_url_https} className="h-24 rounded border border-gray-950 shadow" loading="lazy" draggable="false"/>
					<div className="space-y-1 flex flex-col">
						{details.video_info!.variants.filter(variant => variant.bitrate).map(variant => {
							const resolution = extractResolution(variant.url);
							const state      = downloadStates[variant.url] ?? EVariantDownloadState.Idle;

							return (
								<Button
									key={variant.url}
									type={state === EVariantDownloadState.Downloaded ? 'success' : state === EVariantDownloadState.Error ? 'danger' : 'twitter'}
									size="lg"
									disabled={isDisabled(state) || isWorking}
									onClick={() => tryDownload(variant.url)}>
									<Icon path={renderIcon(state)} className="size-5"/>
									<span>{renderLabel(state, resolution)}</span>
								</Button>
							)
						})}
					</div>
				</div>
			))}
		</div>
	);
};
