import clsx from 'clsx';
import Icon from '@mdi/react';
import { Tabs } from 'radix-ui';
import { useAtom } from 'jotai';
import { useEffect } from 'react';
import { useIpc, useTitle } from '~/hooks';
import { AppTab } from './components/AppTab';
import { DevTab } from './components/DevTab';
import { YoutubeTab } from './components/YoutubeTab';
import { AdvancedTab } from './components/AdvancedTab';
import { workingAtom, updatingAtom } from '~/atoms/app';
import { DownloadsTab } from './components/DownloadsTab';
import { mdiCogs, mdiYoutube, mdiDownload, mdiCodeBraces, mdiApplicationCog } from '@mdi/js';
import type { FC } from 'react';

type TabButtonProps = Tabs.TabsTriggerProps & {
	title: string;
	icon: string;
};

const TabButton: FC<TabButtonProps> = ({ title, icon, value, className }) => {
	const css = clsx(
		'space-x-2',
		'py-0.25 px-3',
		'flex items-center',
		'text-sm text-gray-300 hover:text-white',
		'data-[state=active]:text-white! data-[state=active]:bg-brand-500 data-[state=active]:rounded',
		'data-[state=inactive]:bg-transparent data-[state=inactive]:hover:border-l-brand-500',
		'border-2 border-transparent',
		'transition-all',
		className
	);

	return (
		<Tabs.Trigger value={value} className={css}>
			<Icon className="size-4" path={icon}/>
			<span>{title}</span>
		</Tabs.Trigger>
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
		onUpdatedYtdlpBinary(()  => setIsUpdating(false));
		onDownloadStarted(()     => setIsWorking(true));
		onDownloadFinished(()    => setIsWorking(false));
	}, []);

	return (
		<Tabs.Root defaultValue="app" orientation="vertical" className="h-screen flex items-stretch bg-gray-950">
			<Tabs.List className="p-3 space-y-1.5 w-38 flex flex-col shrink-0 bg-gray-900">
				<TabButton value="app" title="Application" icon={mdiApplicationCog}/>
				<TabButton value="downloads" title="Downloads" icon={mdiDownload}/>
				<TabButton value="youtube" title="YouTube" icon={mdiYoutube}/>
				<TabButton value="advanced" title="Advanced" icon={mdiCogs}/>
				<TabButton value="dev" title="Developer" icon={mdiCodeBraces}/>
			</Tabs.List>
			<div className="p-3 w-full overflow-y-auto [scrollbar-width:thin]">
				<Tabs.Content value="app">
					<AppTab/>
				</Tabs.Content>
				<Tabs.Content value="downloads">
					<DownloadsTab/>
				</Tabs.Content>
				<Tabs.Content value="youtube">
					<YoutubeTab/>
				</Tabs.Content>
				<Tabs.Content value="advanced">
					<AdvancedTab/>
				</Tabs.Content>
				<Tabs.Content value="dev">
					<DevTab/>
				</Tabs.Content>
			</div>
		</Tabs.Root>
	);
};

export default SettingsPage;
