import { cx } from 'cva';
import { useAtom } from 'jotai';
import { Icon } from '@mdi/react';
import { native } from '~/native';
import { mdiUpdate } from '@mdi/js';
import { isValidURL } from '~/utils';
import { tweetURLPattern } from '~/regex';
import { TextInput } from '~/components/Input';
import { Masthead } from './components/Masthead';
import { Spinner } from '~/components/SpinnerV2';
import { TwitterMedia } from './components/TwitterMedia';
import { DownloadButtons } from './components/DownloadButtons';
import { lazy, useRef, Fragment, useState, useEffect } from 'react';
import { HalloweenOverlay } from '~/components/effects/HalloweenOverlay';
import { SettingsKey, EventChannel, RequestChannel } from '~/ipc/ipc.generated';
import { logAtom, clearLogAtom, pushToLogAtom, pushManyToLogAtom } from '~/atoms/log';
import { useTitle, useSetting, useIPCEvent, useKeyPress, useFeatureFlags } from '~/hooks';
import { urlAtom, workingAtom, resetAppAtom, updatingAtom, isURLValidAtom, updateAvailableAtom } from '~/atoms/app';
import type { FC, ChangeEvent } from 'react';

type LogLineProps = { line: string; };
type DownloadProgressPhase = 'hidden' | 'active' | 'fading';

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
	const [progressPhase, setProgressPhase]     = useState<DownloadProgressPhase>('hidden');
	const [useNewTwitterVideoDownloader]        = useSetting(SettingsKey.UseNewTwitterVideoDownloader);
	const [,clearLog]                           = useAtom(clearLogAtom);
	const [,pushToLog]                          = useAtom(pushToLogAtom);
	const [,pushManyToLog]                      = useAtom(pushManyToLogAtom);
	const [,resetApp]                           = useAtom(resetAppAtom);
	const [url, setURL]                         = useAtom(urlAtom);
	const [isWorking, setIsWorking]             = useAtom(workingAtom);
	const [isUpdating, setIsUpdating]           = useAtom(updatingAtom);
	const [updateAvailable, setUpdateAvailable] = useAtom(updateAvailableAtom);
	const [urlIsValid]                          = useAtom(isURLValidAtom);
	const [logs]                                = useAtom(logAtom);

	const mediaURLEl  = useRef<HTMLInputElement>(null);
	const logOutputEl = useRef<HTMLDivElement>(null);
	const progressFadeTimer = useRef<number>(undefined);

	const [isEnabled] = useFeatureFlags();

	const windowCss = cx(
		'relative w-screen h-screen overflow-hidden',
		{
			'border border-accent-500': !native.isWindows11 && !isWorking,
			'border animated-accent-border': !native.isWindows11 && isWorking
		}
	);

	const tryPasting = async () => {
		const text = await native.clipboard.readText();

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
		if (!urlIsValid) {
			return;
		}

		await native.ipc.invoke(RequestChannel.YtDlpDownloadDefault, url);
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

	useIPCEvent(EventChannel.YtDlpDownloadStarted, ({ url }) => {
		window.clearTimeout(progressFadeTimer.current);
		setURL(url);
		setIsWorking(true);
		setProgress(0);
		setProgressPhase('active');
		clearLog();
		pushToLog('OPERATION STARTED');
	});
	useIPCEvent(EventChannel.YtDlpStdout,            ({ lines }) => pushManyToLog(lines));
	useIPCEvent(EventChannel.YtDlpDownloadProgress, ({ progress }) => setProgress(progress));
	useIPCEvent(EventChannel.YtDlpDownloadCanceled, () => {
		window.clearTimeout(progressFadeTimer.current);
		setProgressPhase('fading');
		progressFadeTimer.current = window.setTimeout(() => {
			setProgressPhase('hidden');
			setProgress(0);
		}, 900);
		pushToLog('OPERATION CANCELED');
	});
	useIPCEvent(EventChannel.YtDlpDownloadFinished, () => {
		window.clearTimeout(progressFadeTimer.current);
		setProgress(100);
		setProgressPhase('fading');
		progressFadeTimer.current = window.setTimeout(() => {
			setProgressPhase('hidden');
			setProgress(0);
		}, 900);
		resetApp();
		pushToLog('OPERATION FINISHED');
	});
	useIPCEvent(EventChannel.YtDlpUpdatingBinary, () => setIsUpdating(true));
	useIPCEvent(EventChannel.YtDlpUpdatedBinary,  () => setIsUpdating(false));
	useIPCEvent(EventChannel.UpdaterOutdated,       () => setUpdateAvailable(true));

	useEffect(() => {
		const logOutput = logOutputEl.current;
		if (logOutput) {
			logOutput.scrollTop = logOutput.scrollHeight;
		}
	}, [logs]);

	useEffect(() => () => window.clearTimeout(progressFadeTimer.current), []);

	return (
		<div className={windowCss}>
			{isEnabled('SeasonalEffects') && isSnowfall() && <Snowfall/>}
			{isEnabled('SeasonalEffects') && <HalloweenOverlay/>}
			{progressPhase !== 'hidden' && (
				<div className={cx('download-progress-background', { 'is-fading': progressPhase === 'fading' })} aria-hidden="true">
					<div
						className="download-progress-background-fill"
						style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
					/>
				</div>
			)}
			<div className="relative z-10 flex flex-col size-full bg-transparent">
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
							{updateAvailable && (
								<button
									type="button"
									className="py-1.5 px-2 flex flex-row items-center space-x-2 text-left text-sky-100 bg-sky-950/50 border border-sky-900 hover:text-white hover:bg-sky-900 hover:border-sky-600 rounded cursor-pointer transition"
									onClick={() => native.ipc.invoke(RequestChannel.UpdaterShowWindow)}
								>
									<Icon path={mdiUpdate} className="size-4"/>
									<span className="text-sm">A new version of yay is available.</span>
								</button>
							)}
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
										onDownloadVideoClick={() => native.ipc.invoke(RequestChannel.YtDlpDownloadVideo, url)}
										onDownloadAudioClick={() => native.ipc.invoke(RequestChannel.YtDlpDownloadAudio, url)}
										onCancelDownloadClick={() => native.ipc.invoke(RequestChannel.YtDlpCancelDownload)}
										working={isWorking}
										disabled={!urlIsValid || isUpdating}
									/>
									<div className="grow bg-black/50 border border-gray-900 rounded-xs shadow overflow-hidden">
										<div ref={logOutputEl} className="h-full overflow-y-auto select-text [scrollbar-width:thin]">
											{logs.map(({ id, line }) => (
												<LogLine key={id} line={line}/>
											))}
										</div>
									</div>
								</Fragment>
							)}
						</div>
					</Fragment>
				)}
			</div>
		</div>
	);
};

export default HomePage;
