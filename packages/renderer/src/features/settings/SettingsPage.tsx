import { cx } from 'cva';
import Icon from '@mdi/react';
import { useAtom } from 'jotai';
import { lazy, useEffect} from 'react';
import { useIpc, useTitle } from '~/hooks';
import { AppTab } from './components/AppTab';
import { DevTab } from './components/DevTab';
import { YoutubeTab } from './components/YoutubeTab';
import { AdvancedTab } from './components/AdvancedTab';
import { workingAtom, updatingAtom } from '~/atoms/app';
import { DownloadsTab } from './components/DownloadsTab';
import { Root, List, Trigger, Content } from '@radix-ui/react-tabs';
import { mdiCogs, mdiTools, mdiYoutube, mdiDownload, mdiCodeBraces, mdiApplicationCog } from '@mdi/js';
import type { FC } from 'react';
import type { TabsTriggerProps } from '@radix-ui/react-tabs';

export interface ITabButtonProps extends TabsTriggerProps {
	value: string;
	title: string;
	icon: string;
}

const DebugTab = lazy(() => import('./components/DebugTab'));

const TabButton: FC<ITabButtonProps> = ({ title, icon, value, className }) => {
	return (
		<Trigger
			value={value}
			className={cx(
				'flex items-center space-x-2 py-1 px-3 font-display text-sm transition-all',
				'data-[state=inactive]:text-gray-300 data-[state=inactive]:hover:text-white',
				'data-[state=active]:bg-accent-600 data-[state=active]:text-accent-600-contrast data-[state=active]:rounded-xs',
				className,
			)}
		>
			<Icon className="size-4" path={icon} />
			<span>{title}</span>
		</Trigger>
	);
};

export const SettingsPage = () => {
	const [,setIsWorking]         = useAtom(workingAtom);
	const [,setIsUpdating]        = useAtom(updatingAtom);
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
		<Root defaultValue="app" orientation="vertical" className="h-screen flex items-stretch bg-gray-900">
			<List className="p-3 space-y-1.5 w-38 flex flex-col shrink-0 bg-gray-950">
				<TabButton value="app" title="Application" icon={mdiApplicationCog}/>
				<TabButton value="downloads" title="Downloads" icon={mdiDownload}/>
				<TabButton value="youtube" title="YouTube" icon={mdiYoutube}/>
				<TabButton value="advanced" title="Advanced" icon={mdiCogs}/>
				<TabButton value="dev" title="Developer" icon={mdiCodeBraces}/>
				{import.meta.env.DEV && <TabButton value="debug" title="Debug" icon={mdiTools}/>}
			</List>

			<div className="p-3 w-full overflow-y-auto [scrollbar-width:thin]">
				<Content value="app">
					<AppTab />
				</Content>
				<Content value="downloads">
					<DownloadsTab />
				</Content>
				<Content value="youtube">
					<YoutubeTab />
				</Content>
				<Content value="advanced">
					<AdvancedTab />
				</Content>
				<Content value="dev">
					<DevTab />
				</Content>
				{import.meta.env.DEV && (
					<Content value="debug">
						<DebugTab/>
					</Content>
				)}
			</div>
		</Root>
	);
};

export default SettingsPage;
