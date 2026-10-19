import { useState } from 'react';
import { native } from '~/native';
import { useIPCEvent } from '~/hooks';
import videoIcon from '~/assets/img/menu-icons/video.png';
import { GlobalMenuItem } from './components/GlobalMenuItem';
import audioIcon from '~/assets/img/menu-icons/music-note.png';
import folderIcon from '~/assets/img/menu-icons/folder-open.png';
import { EventChannel, RequestChannel } from '~/ipc/ipc.generated';
import { GlobalMenuSeparator } from './components/GlobalMenuSeparator';

export const GlobalMenuPage = () => {
	const [isDownloadsDisabled, setIsDownloadsDisabled] = useState(false);

	useIPCEvent(EventChannel.YtDlpDownloadStarted,  () => setIsDownloadsDisabled(true));
	useIPCEvent(EventChannel.YtDlpDownloadFinished, () => setIsDownloadsDisabled(false));

	return (
		<div className="w-screen h-screen">
			<div className="w-full h-full flex flex-col items-stretch bg-transparent">
				<GlobalMenuItem
					icon={videoIcon}
					text="Video from clipboard"
					onClick={() => native.ipc.invoke(RequestChannel.GlobalMenuDownloadFromClipboard, false)}
					disabled={isDownloadsDisabled}
				/>
				<GlobalMenuItem
					icon={audioIcon}
					text="Audio from clipboard"
					onClick={() => native.ipc.invoke(RequestChannel.GlobalMenuDownloadFromClipboard, true)}
					disabled={isDownloadsDisabled}
				/>
				<GlobalMenuSeparator/>
				<GlobalMenuItem
					icon={folderIcon}
					text="Open download folder"
					onClick={() => native.ipc.invoke(RequestChannel.GlobalMenuOpenDownloadDir)}
				/>
			</div>
		</div>
	);
};

export default GlobalMenuPage;
