import { cx } from 'cva';
import { lazy} from 'react';
import { useAtom } from 'jotai';
import { Icon } from '@mdi/react';
import { useIPCEvent } from '~/hooks';
import { APITab } from './components/APITab';
import { AppTab } from './components/AppTab';
import { AboutTab } from './components/AboutTab';
import { YoutubeTab } from './components/YoutubeTab';
import { WindowShell } from '~/components/WindowShell';
import { AdvancedTab } from './components/AdvancedTab';
import { workingAtom, updatingAtom } from '~/atoms/app';
import { DownloadsTab } from './components/DownloadsTab';
import { Root, List, Trigger, Content } from '@radix-ui/react-tabs';
import { mdiCogs, mdiTools, mdiYoutube, mdiDownload, mdiCodeBraces, mdiInformation, mdiApplicationCog } from '@mdi/js';
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
				'flex items-center py-2 px-3 font-display text-sm transition-all',
				'data-[state=inactive]:text-gray-300 data-[state=inactive]:hover:text-white',
				'data-[state=active]:bg-accent-600 data-[state=active]:text-accent-600-contrast',
				className,
			)}
		>
			<Icon className="mr-auto size-5" path={icon}/>
			<span>{title}</span>
		</Trigger>
	);
};

export const SettingsPage = () => {
	const [,setIsWorking]         = useAtom(workingAtom);
	const [,setIsUpdating]        = useAtom(updatingAtom);

	useIPCEvent('yt-dlp->download-started',  () => setIsWorking(true));
	useIPCEvent('yt-dlp->download-finished', () => setIsWorking(false));
	useIPCEvent('yt-dlp->updating-binary',   () => setIsUpdating(true));
	useIPCEvent('yt-dlp->updated-binary',    () => setIsUpdating(false));

	return (
		<WindowShell windowName="settings" title="Settings">
			<Root defaultValue="app" orientation="vertical" className="h-[calc(100vh-34px)] flex items-stretch bg-gray-950 overflow-y-auto">
				<List className="py-3 w-36 flex flex-col shrink-0 bg-black/50">
					<TabButton value="app" title="Application" icon={mdiApplicationCog}/>
					<TabButton value="downloads" title="Downloads" icon={mdiDownload}/>
					<TabButton value="youtube" title="YouTube" icon={mdiYoutube}/>
					<TabButton value="api" title="API" icon={mdiCodeBraces}/>
					<TabButton value="advanced" title="Advanced" icon={mdiCogs}/>
					<TabButton value="about" title="About" icon={mdiInformation}/>
					{import.meta.env.DEV && <TabButton value="debug" title="Debug" icon={mdiTools}/>}
				</List>
				<div className="p-3 w-full overflow-y-auto [scrollbar-width:thin]">
					<Content value="app">
						<AppTab/>
					</Content>
					<Content value="downloads">
						<DownloadsTab/>
					</Content>
					<Content value="youtube">
						<YoutubeTab/>
					</Content>
					<Content value="api">
						<APITab/>
					</Content>
					<Content value="advanced">
						<AdvancedTab/>
					</Content>
					<Content value="about">
						<AboutTab/>
					</Content>
					{import.meta.env.DEV && (
						<Content value="debug">
							<DebugTab/>
						</Content>
					)}
				</div>
			</Root>
		</WindowShell>
	);
};

export default SettingsPage;
