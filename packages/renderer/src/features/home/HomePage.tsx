import { cx } from 'cva';
import { useAtom } from 'jotai';
import { Icon } from '@mdi/react';
import { mdiUpdate } from '@mdi/js';
import { useKeyPress } from 'ahooks';
import { TextInput } from '~/components/Input';
import { Masthead } from './components/Masthead';
import { Spinner } from '~/components/SpinnerV2';
import { TwitterMedia } from './components/TwitterMedia';
import { DownloadButtons } from './components/DownloadButtons';
import { logAtom, clearLogAtom, pushToLogAtom } from '~/atoms/log';
import { isValidURL, ESettingsKey, tweetURLPattern } from 'shared';
import { useTitle, useSetting, useIPCEvent, useFeatureFlags } from '~/hooks';
import { lazy, useRef, Activity, useState, Fragment, useEffect } from 'react';
import { urlAtom, workingAtom, updatingAtom, resetAppAtom, updateAvailableAtom, isURLValidAtom } from '~/atoms/app';
import type { FC, ChangeEvent } from 'react';

type LogLineProps = { line: string; };

const Snowfall = lazy(() => import('~/components/effects/Snowfall'));

const LogLine: FC<LogLineProps> = ({ line, ...props }) => {
	const css = cx(
		'py-1 px-2 flex flex-row items-center text-[10px] font-mono wrap-anywhere even:bg-gray-900',
		{
			'text-sky-400': line.includes('[info]'),
			'text-lime-400': line.includes('[download]'),
			'text-red-500 font-bold': line.startsWith('ERROR'),
			'text-brand-600': line.startsWith('OPERATION '),
		}
	);
	return (
		<p className={css} {...props}>
			<span>{line}</span>
		</p>
	);
};

const isSnowfall = () => {
	const date  = new Date();
	const month = date.getMonth();

	return month === 11 || month === 0;
};

export const HomePage = () => {
	const [isTweetURL, setIsTweetURL]           = useState(false);
	const [progress, setProgress]               = useState(0); // TODO maybe add this to global state?
	const [useNewTwitterVideoDownloader]        = useSetting<boolean>(ESettingsKey.UseNewTwitterVideoDownloader);
	const [,clearLog]                           = useAtom(clearLogAtom);
	const [,pushToLog]                          = useAtom(pushToLogAtom);
	const [,resetApp]                           = useAtom(resetAppAtom);
	const [url, setURL]                         = useAtom(urlAtom);
	const [isWorking, setIsWorking]             = useAtom(workingAtom);
	const [isUpdating, setIsUpdating]           = useAtom(updatingAtom);
	const [updateAvailable, setUpdateAvailable] = useAtom(updateAvailableAtom);
	const [urlIsValid]                          = useAtom(isURLValidAtom);
	const [logs]                                = useAtom(logAtom);

	const mediaURLEl  = useRef<HTMLInputElement>(null);
	const logOutputEl = useRef<HTMLDivElement>(null);

	const [isEnabled] = useFeatureFlags();

	const accentCss = cx(
		'absolute -z-10',
		{
			'inset-0 bg-accent-500': !isWorking,
			'-inset-137.5 bg-[linear-gradient(90deg,transparent_0%,var(--accent-500)_100%)] animate-spin': isWorking
		}
	);

	const tryPasting = async () => {
		const text = await navigator.clipboard.readText();

		setIsTweetURL(tweetURLPattern.test(text));

		if (isValidURL(text)) {
			setURL(text);
		}
	};
	const trySelectingInput = () => {
		mediaURLEl.current?.focus();
		mediaURLEl.current?.select();
	};
	const trySubmitting = async () => {
		if (!isValidURL) {
			return;
		}

		await window.ipc.invoke('yt-dlp<-download-default', url);
	};
	const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
		const url = event.target.value.trim();

		setIsTweetURL(tweetURLPattern.test(url));
		setURL(url);
	};

	useTitle('yay');

	useKeyPress('enter',    () => trySubmitting());
	useKeyPress(['ctrl.v'], () => tryPasting(), { exactMatch: true });
	useKeyPress(['ctrl.a'], () => trySelectingInput(), { exactMatch: true });

	useIPCEvent('yt-dlp->download-started', ({ url }) => {
		setURL(url);
		setIsWorking(true);
		clearLog();
		pushToLog('OPERATION STARTED');
	});
	useIPCEvent('yt-dlp->stdout',            ({ line }) => pushToLog(line));
	useIPCEvent('yt-dlp->download-progress', ({ progress }) => setProgress(progress));
	useIPCEvent('yt-dlp->download-canceled', () => pushToLog('OPERATION CANCELED'));
	useIPCEvent('yt-dlp->download-finished', () => {
		resetApp();
		setProgress(0);
		pushToLog('OPERATION FINISHED');
	});
	useIPCEvent('yt-dlp->updating-binary', () => setIsUpdating(true));
	useIPCEvent('yt-dlp->updated-binary',  () => setIsUpdating(false));
	useIPCEvent('updater->outdated',       () => setUpdateAvailable(true));

	useEffect(() => {
		logOutputEl.current!.scrollTop = logOutputEl.current!.scrollHeight;
	}, [logs]);

	return (
		<div className="relative p-px w-screen h-screen overflow-hidden">
			{isEnabled('SeasonalEffects') && isSnowfall() && <Snowfall/>}
			<div className="flex flex-col w-[calc(100vw-2px)] h-[calc(100vh-2px)] bg-gray-950">
				{isUpdating ? (
					<div className="flex flex-col items-center justify-center h-full">
						<div className="space-x-2 flex items-center">
							<Spinner className="size-6"/>
							<p>Updating yt-dlp, please wait&hellip;</p>
						</div>
					</div>
				) : (
					<Fragment>
						<Masthead/>
						<div className="p-3 h-full flex flex-col space-y-4 overflow-hidden">
							<Activity mode={updateAvailable ? 'visible' : 'hidden'}>
								<a className="py-1.5 px-2 flex flex-row items-center space-x-2 text-sky-100 bg-sky-950/50 border border-sky-900 hover:text-white hover:bg-sky-900 hover:border-sky-600 rounded cursor-pointer transition" onClick={() => window.ipc.invoke('updater<-show-window')}>
									<Icon path={mdiUpdate} className="size-4"/>
									<p className="text-sm">A new version of yay is available.</p>
								</a>
							</Activity>
							<TextInput
								ref={mediaURLEl}
								onChange={onInputChange}
								value={url}
								placeholder="Media URL"
								disabled={isWorking || isUpdating}
								readOnly={isWorking || isUpdating}
							/>
							{(isTweetURL && useNewTwitterVideoDownloader) ? (
								<TwitterMedia tweetURL={url}/>
							) : (
								<Fragment>
									<DownloadButtons
										onDownloadVideoClick={() => window.ipc.invoke('yt-dlp<-download-video', url)}
										onDownloadAudioClick={() => window.ipc.invoke('yt-dlp<-download-audio', url)}
										onCancelDownloadClick={() => window.ipc.invoke('yt-dlp<-cancel-download')}
										working={isWorking}
										progress={progress}
										disabled={!urlIsValid || isUpdating}
									/>
									<div className="grow bg-black/50 border border-gray-900 rounded-xs shadow overflow-hidden">
										<div ref={logOutputEl} className="h-full overflow-y-auto select-text [scrollbar-width:thin]">
											{logs.map((line, i) => (
												<LogLine key={i} line={line}/>
											))}
										</div>
									</div>
								</Fragment>
							)}
						</div>
					</Fragment>
				)}
			</div>
			<div className={accentCss}/>
		</div>
	);
};

export default HomePage;
