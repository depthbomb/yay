import { cx } from 'cva';
import Icon from '@mdi/react';
import { useAtom } from 'jotai';
import { useEffect} from 'react';
import { useIpc, useTitle } from '~/hooks';
import { TabsV2 } from '~/components/TabsV2';
import { AppTab } from './components/AppTab';
import { DevTab } from './components/DevTab';
import { YoutubeTab } from './components/YoutubeTab';
import { AdvancedTab } from './components/AdvancedTab';
import { DownloadsTab } from './components/DownloadsTab';
import { workingAtom, updatingAtom } from '~/atoms/app';
import { mdiCogs, mdiYoutube, mdiDownload, mdiCodeBraces, mdiApplicationCog } from '@mdi/js';
import type { FC } from 'react';

type TabButtonProps = {
	value: string;
	title: string;
	icon: string;
};

const TabButton: FC<TabButtonProps> = ({ title, icon, value }) => {
	return (
		<TabsV2.Trigger
			value={value}
			className={(isActive) =>
				cx(
					'flex items-center space-x-2 py-1 px-3 font-display text-sm transition-all',
					isActive ? 'bg-brand-600 text-white rounded' : 'text-gray-300 hover:text-white'
				)
			}
		>
			<Icon className="size-4" path={icon} />
			<span>{title}</span>
		</TabsV2.Trigger>
	);
};

export const SettingsPage = () => {
	const [, setIsWorking]  = useAtom(workingAtom);
	const [, setIsUpdating] = useAtom(updatingAtom);

	const [onDownloadStarted]     = useIpc('yt-dlp->download-started');
	const [onDownloadFinished]    = useIpc('yt-dlp->download-finished');
	const [onUpdatingYtdlpBinary] = useIpc('yt-dlp->updating-binary');
	const [onUpdatedYtdlpBinary]  = useIpc('yt-dlp->updated-binary');

	useTitle('Settings');

	useEffect(() => {
		onUpdatingYtdlpBinary(() => setIsUpdating(true));
		onUpdatedYtdlpBinary(() => setIsUpdating(false));
		onDownloadStarted(() => setIsWorking(true));
		onDownloadFinished(() => setIsWorking(false));
	}, []);

	return (
		<TabsV2.Root defaultValue="app" orientation="vertical" className="h-screen flex items-stretch bg-gray-950">
			<TabsV2.List className="p-3 space-y-1.5 w-38 flex flex-col shrink-0 bg-gray-900">
				<TabButton value="app" title="Application" icon={mdiApplicationCog} />
				<TabButton value="downloads" title="Downloads" icon={mdiDownload} />
				<TabButton value="youtube" title="YouTube" icon={mdiYoutube} />
				<TabButton value="advanced" title="Advanced" icon={mdiCogs} />
				<TabButton value="dev" title="Developer" icon={mdiCodeBraces} />
			</TabsV2.List>

			<div className="p-3 w-full overflow-y-auto [scrollbar-width:thin]">
				<TabsV2.Content value="app">
					<AppTab />
				</TabsV2.Content>
				<TabsV2.Content value="downloads">
					<DownloadsTab />
				</TabsV2.Content>
				<TabsV2.Content value="youtube">
					<YoutubeTab />
				</TabsV2.Content>
				<TabsV2.Content value="advanced">
					<AdvancedTab />
				</TabsV2.Content>
				<TabsV2.Content value="dev">
					<DevTab />
				</TabsV2.Content>
			</div>
		</TabsV2.Root>
	);
};

export default SettingsPage;
