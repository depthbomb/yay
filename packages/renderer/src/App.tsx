import clsx from 'clsx';
import { useAtom } from 'jotai';
import { useEffect } from 'react';
import { SettingsKey } from 'shared';
import { useIpc, useSetting } from './hooks';
import { Spinner } from './components/SpinnerV2';
import { AppFooter } from './components/AppFooter';
import { HomePage } from './features/home/HomePage';
import { AppMasthead } from './components/AppMasthead';
import { clearLogAtom, pushToLogAtom } from './atoms/log';
import { useNativeTextMenu } from './hooks/useNativeTextMenu';
import { urlAtom, workingAtom, updatingAtom, resetAppAtom, updateAvailableAtom } from './atoms/app';

export const App = () => {
	const [,clearLog]                 = useAtom(clearLogAtom);
	const [,pushToLog]                = useAtom(pushToLogAtom);
	const [,resetApp]                 = useAtom(resetAppAtom);
	const [,setUrl]                   = useAtom(urlAtom);
	const [isWorking, setIsWorking]   = useAtom(workingAtom);
	const [isUpdating, setIsUpdating] = useAtom(updatingAtom);
	const [,setUpdateAvailable]       = useAtom(updateAvailableAtom);
	const [showHintFooter]            = useSetting(SettingsKey.ShowHintFooter, { defaultValue: true });
	const [onDownloadStarted]         = useIpc('yt-dlp->download-started');
	const [onDownloadOutput]          = useIpc('yt-dlp->stdout');
	const [onDownloadCanceled]        = useIpc('yt-dlp->download-canceled');
	const [onDownloadFinished]        = useIpc('yt-dlp->download-finished');
	const [onUpdatingYtdlpBinary]     = useIpc('yt-dlp->updating-binary');
	const [onUpdatedYtdlpBinary]      = useIpc('yt-dlp->updated-binary');
	const [onUpdateAvailable]         = useIpc('updater->outdated');

	const accentCss = clsx(
		'absolute -z-10',
		{
			'inset-0 [background-image:linear-gradient(90deg,_#FF0033_0%,_#FF2790_100%)]': !isWorking,
			'inset-[-550px] [background-image:linear-gradient(90deg,_#000_0%,_#FF2790_100%)] animate-[spin_1s_linear_infinite]': isWorking
		}
	);

	useNativeTextMenu();

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
						<HomePage/>
						{showHintFooter && <AppFooter/>}
					</>
				)}
			</div>
			<div className={accentCss}/>
		</div>
	);
};
