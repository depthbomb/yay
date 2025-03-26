import clsx from 'clsx';
import { useAtom } from 'jotai';
import { useEffect } from 'react';
import { useIpc, useSetting } from './hooks';
import { Spinner } from './components/Spinner';
import { IpcChannel, SettingsKey } from 'shared';
import { HomePage } from './features/home/HomePage';
import { AppMasthead } from './components/AppMasthead';
import { clearLogAtom, pushToLogAtom } from './atoms/log';
import { Route, Routes, MemoryRouter } from 'react-router';
import { DevInfoPage } from './features/dev-info/DevInfoPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { urlAtom, workingAtom, updatingAtom, resetAppAtom, updateAvailableAtom } from './atoms/app';

export const App = () => {
	const [showWindowFrame]           = useSetting(SettingsKey.ShowWindowFrame, { defaultValue: false });
	const [,clearLog]                 = useAtom(clearLogAtom);
	const [,pushToLog]                = useAtom(pushToLogAtom);
	const [,resetApp]                 = useAtom(resetAppAtom);
	const [,setUrl]                   = useAtom(urlAtom);
	const [isWorking, setIsWorking]   = useAtom(workingAtom);
	const [isUpdating, setIsUpdating] = useAtom(updatingAtom);
	const [,setUpdateAvailable]       = useAtom(updateAvailableAtom);
	const [onDownloadStarted]         = useIpc(IpcChannel.Ytdlp_DownloadStarted);
	const [onDownloadOutput]          = useIpc(IpcChannel.Ytdlp_Stdout);
	const [onDownloadCanceled]        = useIpc(IpcChannel.Ytdlp_DownloadCanceled);
	const [onDownloadFinished]        = useIpc(IpcChannel.Ytdlp_DownloadFinished);
	const [onUpdatingYtdlpBinary]     = useIpc(IpcChannel.Ytdlp_UpdatingBinary);
	const [onUpdatedYtdlpBinary]      = useIpc(IpcChannel.Ytdlp_UpdatedBinary);
	const [onUpdateAvailable]         = useIpc(IpcChannel.Updater_Outdated);

	const accentCss = clsx(
		'absolute -z-10',
		{
			'inset-0 [background-image:linear-gradient(90deg,_#FF0033_0%,_#FF2790_100%)]': !isWorking,
			'inset-[-550px] [background-image:linear-gradient(90deg,_#000_0%,_#FF2790_100%)] animate-[spin_1s_linear_infinite]': isWorking
		}
	);

	useEffect(() => {
		onDownloadStarted((url: string) => {
			setUrl(url);
			setIsWorking(true);
			clearLog();
			pushToLog('OPERATION STARTED');
		});

		onDownloadOutput((line: string) => pushToLog(line));

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
					<MemoryRouter>
						<AppMasthead/>
						<Routes>
							<Route index element={<HomePage/>}/>
							<Route path="settings" element={<SettingsPage/>}/>
							<Route path="dev-info" element={<DevInfoPage/>}/>
							<Route path="*" element={<HomePage/>}/>
						</Routes>
					</MemoryRouter>
				)}
			</div>
			{!showWindowFrame && <div className={accentCss}/>}
		</div>
	);
};
