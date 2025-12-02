import { cx } from 'cva';
import Icon from '@mdi/react';
import { useAtom } from 'jotai';
import { mdiUpdate } from '@mdi/js';
import { isValidURL } from 'shared';
import { TextInput } from '~/components/Input';
import { Masthead } from './components/Masthead';
import { Spinner } from '~/components/SpinnerV2';
import { lazy, useRef, Activity, useEffect } from 'react';
import { DownloadButtons } from './components/DownloadButtons';
import { logAtom, clearLogAtom, pushToLogAtom } from '~/atoms/log';
import { useIpc, useTitle, useKeyPress, useNativeTextMenu, useFeatureFlags } from '~/hooks';
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
	const [,clearLog]                           = useAtom(clearLogAtom);
	const [,pushToLog]                          = useAtom(pushToLogAtom);
	const [,resetApp]                           = useAtom(resetAppAtom);
	const [url, setURL]                         = useAtom(urlAtom);
	const [isWorking, setIsWorking]             = useAtom(workingAtom);
	const [isUpdating, setIsUpdating]           = useAtom(updatingAtom);
	const [updateAvailable, setUpdateAvailable] = useAtom(updateAvailableAtom);
	const [urlIsValid]                          = useAtom(isURLValidAtom);
	const [logs]                                = useAtom(logAtom);

	const [onDownloadStarted]     = useIpc('yt-dlp->download-started');
	const [onDownloadOutput]      = useIpc('yt-dlp->stdout');
	const [onDownloadCanceled]    = useIpc('yt-dlp->download-canceled');
	const [onDownloadFinished]    = useIpc('yt-dlp->download-finished');
	const [onUpdatingYtdlpBinary] = useIpc('yt-dlp->updating-binary');
	const [onUpdatedYtdlpBinary]  = useIpc('yt-dlp->updated-binary');
	const [onUpdateAvailable]     = useIpc('updater->outdated');

	const mediaURLEl  = useRef<HTMLInputElement>(null);
	const logOutputEl = useRef<HTMLDivElement>(null);

	const [isEnabled] = useFeatureFlags();

	const accentCss = cx(
		'absolute -z-10',
		{
			'inset-0 bg-accent-500': !isWorking,
			'inset-[-550px] bg-[linear-gradient(90deg,transparent_0%,var(--accent-500)_100%)] animate-spin': isWorking
		}
	);

	const tryPasting = async () => {
		const text = await navigator.clipboard.readText();
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

	useTitle('yay');
	useNativeTextMenu();

	useKeyPress({ key: 'Enter', onKeyPress: trySubmitting });
	useKeyPress({ key: 'v', modifiers: { ctrl: true }, onKeyPress: tryPasting });
	useKeyPress({ key: 'a', modifiers: { ctrl: true }, onKeyPress: trySelectingInput });

	useEffect(() => {
		onDownloadStarted(({ url }) => {
			setURL(url);
			setIsWorking(true);
			clearLog();
			pushToLog('OPERATION STARTED');
		});

		onDownloadOutput(({ line }) => pushToLog(line));

		onDownloadFinished(() => {
			resetApp();
			pushToLog('OPERATION FINISHED')
		});

		onDownloadCanceled(() => pushToLog('OPERATION CANCELED'));
		onUpdatingYtdlpBinary(() => setIsUpdating(true));
		onUpdatedYtdlpBinary(() => setIsUpdating(false));
		onUpdateAvailable(() => setUpdateAvailable(true));
	}, []);

	useEffect(() => {
		logOutputEl.current!.scrollTop = logOutputEl.current!.scrollHeight;
	}, [logs]);

	const onInputChange = (event: ChangeEvent<HTMLInputElement>) => setURL(event.target.value.trim());

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
					<>
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
							<DownloadButtons
								onDownloadVideoClick={() => window.ipc.invoke('yt-dlp<-download-video', url)}
								onDownloadAudioClick={() => window.ipc.invoke('yt-dlp<-download-audio', url)}
								onCancelDownloadClick={() => window.ipc.invoke('yt-dlp<-cancel-download')}
								working={isWorking}
								disabled={!urlIsValid || isUpdating}
							/>
							<div className="grow bg-black/50 border border-gray-900 rounded-xs shadow overflow-hidden">
								<div ref={logOutputEl} className="h-full overflow-y-auto select-text [scrollbar-width:thin]">
									{logs.map((line, i) => (
										<LogLine key={i} line={line}/>
									))}
								</div>
							</div>
						</div>
					</>
				)}
			</div>
			<div className={accentCss}/>
		</div>
	);
};

export default HomePage;
