import clsx from 'clsx';
import Icon from '@mdi/react';
import { useAtom } from 'jotai';
import { mdiUpdate } from '@mdi/js';
import { isValidHttpUrl } from 'shared';
import { TextInput } from '~/components/input';
import { Spinner } from '~/components/SpinnerV2';
import { useRef, Activity, useEffect } from 'react';
import { AppMasthead } from '~/components/AppMasthead';
import { DownloadButtons } from './components/DownloadButtons';
import { useIpc, useTitle, useKeyCombo, useNativeTextMenu } from '~/hooks';
import { logAtom, shiftLogAtom, clearLogAtom, pushToLogAtom } from '~/atoms/log';
import { urlAtom, workingAtom, updatingAtom, resetAppAtom, updateAvailableAtom, isUrlValidAtom } from '~/atoms/app';
import type { FC, ChangeEvent } from 'react';

type LogLineProps = { line: string; };

const LogLine: FC<LogLineProps> = ({ line, ...props }) => {
	const css = clsx(
		'py-1 px-2 flex flex-row items-center text-[10px] font-mono wrap-anywhere even:bg-gray-900',
		{
			'text-sky-500': line.includes('[info]'),
			'text-yellow-500': line.includes('[download]'),
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

export const HomePage = () => {
	const [,clearLog]                           = useAtom(clearLogAtom);
	const [,pushToLog]                          = useAtom(pushToLogAtom);
	const [,resetApp]                           = useAtom(resetAppAtom);
	const [url, setUrl]                         = useAtom(urlAtom);
	const [isWorking, setIsWorking]             = useAtom(workingAtom);
	const [isUpdating, setIsUpdating]           = useAtom(updatingAtom);
	const [updateAvailable, setUpdateAvailable] = useAtom(updateAvailableAtom);
	const [isValidUrl]                          = useAtom(isUrlValidAtom);
	const [logs]                                = useAtom(logAtom);
	const [,shiftLog]                           = useAtom(shiftLogAtom);

	const [onDownloadStarted]     = useIpc('yt-dlp->download-started');
	const [onDownloadOutput]      = useIpc('yt-dlp->stdout');
	const [onDownloadCanceled]    = useIpc('yt-dlp->download-canceled');
	const [onDownloadFinished]    = useIpc('yt-dlp->download-finished');
	const [onUpdatingYtdlpBinary] = useIpc('yt-dlp->updating-binary');
	const [onUpdatedYtdlpBinary]  = useIpc('yt-dlp->updated-binary');
	const [onUpdateAvailable]     = useIpc('updater->outdated');

	const mediaUrlEl  = useRef<HTMLInputElement>(null);
	const logOutputEl = useRef<HTMLDivElement>(null);

	const accentCss = clsx(
		'absolute -z-10',
		{
			'inset-0 [background-image:linear-gradient(90deg,_#FF0033_0%,_#FF2790_100%)]': !isWorking,
			'inset-[-550px] [background-image:linear-gradient(90deg,_#000_0%,_#FF2790_100%)] animate-[spin_1s_linear_infinite]': isWorking
		}
	);

	const tryPasting = async () => {
		const text = await navigator.clipboard.readText();
		if (isValidHttpUrl(text)) {
			setUrl(text);
		}
	};
	const trySelectingInput = () => {
		mediaUrlEl.current?.focus();
		mediaUrlEl.current?.select();
	};
	const trySubmitting = async () => {
		if (!isValidUrl) {
			return;
		}

		await window.ipc.invoke('yt-dlp<-download-default', url);
	};

	useTitle('yay');
	useNativeTextMenu();

	useKeyCombo({ key: 'enter' }, trySubmitting);
	useKeyCombo({ key: 'v', ctrl: true }, tryPasting);
	useKeyCombo({ key: 'a', ctrl: true }, trySelectingInput);

	useEffect(() => {
		onDownloadStarted(({ url }) => {
			setUrl(url);
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
		if (logs.length > 250) {
			shiftLog();
		}

		logOutputEl.current!.scrollTop = logOutputEl.current!.scrollHeight;
	}, [logs]);

	const onInputChange = (event: ChangeEvent<HTMLInputElement>) => setUrl(event.target.value.trim());

	return (
		<div className="relative p-[1px] w-screen h-screen overflow-hidden">
			<div className="flex flex-col w-[calc(100vw-2px)] h-[calc(100vh-2px)] bg-black">
				{isUpdating ? (
					<div className="flex flex-col items-center justify-center h-full">
						<div className="space-x-2 flex items-center">
							<Spinner className="size-6"/>
							<p>Updating yt-dlp, please wait&hellip;</p>
						</div>
					</div>
				) : (
					<>
						<AppMasthead/>
						<div className="p-3 h-full flex flex-col space-y-4 overflow-hidden">
							<Activity mode={updateAvailable ? 'visible' : 'hidden'}>
								<a className="py-1.5 px-2 flex flex-row items-center space-x-2 text-sky-100 bg-sky-950/50 border border-sky-900 hover:text-white hover:bg-sky-900 hover:border-sky-600 rounded cursor-pointer transition" onClick={() => window.ipc.invoke('updater<-show-window')}>
									<Icon path={mdiUpdate} className="size-4"/>
									<p className="text-sm">A new version of yay is available.</p>
								</a>
							</Activity>
							<TextInput
								ref={mediaUrlEl}
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
								disabled={!isValidUrl || isUpdating}
							/>
							<div className="grow bg-black border border-gray-600 rounded overflow-hidden">
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
