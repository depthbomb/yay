import { useIpc } from '~/hooks';
import { useState, useEffect } from 'react';
import { GlobalMenuItem } from './components/GlobalMenuItem';
import { GlobalMenuSeparator } from './components/GlobalMenuSeparator';

import videoIcon from '~/assets/img/menu-icons/video.png';
import folderIcon from '~/assets/img/menu-icons/folder-open.png';
import audioIcon from '~/assets/img/menu-icons/music-note.png';

export const GlobalMenuPage = () => {
	const [isDownloadsDisabled, setIsDownloadsDisabled] = useState(false);
	const [onDownloadStarted]                           = useIpc('yt-dlp->download-started');
	const [onDownloadFinished]                          = useIpc('yt-dlp->download-finished');

	useEffect(() => {
		onDownloadStarted(()  => setIsDownloadsDisabled(true));
		onDownloadFinished(() => setIsDownloadsDisabled(false));
	}, [onDownloadStarted, onDownloadFinished]);

	return (
		<div className="relative p-px w-screen h-screen">
			<div className="w-[calc(100vw-2px)] h-[calc(100vh-2px)] flex flex-col items-stretch bg-gray-950">
				<GlobalMenuItem
					icon={videoIcon}
					text="Video from clipboard"
					onClick={() => window.ipc.invoke('global-menu<-download-from-clipboard', false)}
					disabled={isDownloadsDisabled}
				/>
				<GlobalMenuItem
					icon={audioIcon}
					text="Audio from clipboard"
					onClick={() => window.ipc.invoke('global-menu<-download-from-clipboard', true)}
					disabled={isDownloadsDisabled}
				/>
				<GlobalMenuSeparator/>
				<GlobalMenuItem
					icon={folderIcon}
					text="Open download folder"
					onClick={() => window.ipc.invoke('global-menu<-open-download-dir')}
				/>
			</div>
			<div className="absolute inset-0 bg-accent-500 -z-10"/>
		</div>
	);
};

export default GlobalMenuPage;
