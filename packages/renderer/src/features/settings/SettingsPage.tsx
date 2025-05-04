import clsx from 'clsx';
import { Tabs } from 'radix-ui';
import { useAtom } from 'jotai';
import { useIpc } from '~/hooks';
import { IpcChannel } from 'shared';
import { AppTab } from './components/AppTab';
import { DevTab } from './components/DevTab';
import { YoutubeTab } from './components/YoutubeTab';
import { AdvancedTab } from './components/AdvancedTab';
import { workingAtom, updatingAtom } from '~/atoms/app';
import { InterfaceTab } from './components/InterfaceTab';
import { DownloadsTab } from './components/DownloadsTab';
import type { FC } from 'react';

type TabButtonProps = Tabs.TabsTriggerProps;

const TabButton: FC<TabButtonProps> = ({ value, className, ...props }) => {
	const css = clsx(
		'py-0.25 px-3',
		'text-sm text-gray-300 hover:text-white',
		'data-[state=active]:text-white! data-[state=active]:bg-brand-500 data-[state=active]:rounded',
		'data-[state=inactive]:bg-transparent data-[state=inactive]:hover:border-l-brand-500',
		'border-2 border-transparent',
		'transition-all',
		className
	);

	return (
		<Tabs.Trigger value={value} className={css}>
			{props.children}
		</Tabs.Trigger>
	);
};

export const SettingsPage = () => {
	const [,setIsWorking]         = useAtom(workingAtom);
	const [,setIsUpdating]        = useAtom(updatingAtom);
	const [onDownloadStarted]     = useIpc(IpcChannel.Ytdlp_DownloadStarted);
	const [onDownloadFinished]    = useIpc(IpcChannel.Ytdlp_DownloadFinished);
	const [onUpdatingYtdlpBinary] = useIpc(IpcChannel.Ytdlp_UpdatingBinary);
	const [onUpdatedYtdlpBinary]  = useIpc(IpcChannel.Ytdlp_UpdatedBinary);

	onUpdatingYtdlpBinary(() => setIsUpdating(true));
	onUpdatedYtdlpBinary(()  => setIsUpdating(false));
	onDownloadStarted(()     => setIsWorking(true));
	onDownloadFinished(()    => setIsWorking(false));

	return (
		<Tabs.Root defaultValue="app" orientation="vertical" className="h-screen flex items-stretch bg-gray-950">
			<Tabs.List className="p-3 space-y-1.5 w-32 flex flex-col shrink-0 bg-gray-900">
				<TabButton value="app">
					Application
				</TabButton>
				<TabButton value="interface">
					Interface
				</TabButton>
				<TabButton value="downloads">
					Downloads
				</TabButton>
				<TabButton value="youtube">
					YouTube
				</TabButton>
				<TabButton value="advanced">
					Advanced
				</TabButton>
				<TabButton value="dev">
					Developer
				</TabButton>
			</Tabs.List>
			<div className="p-3 w-full overflow-y-auto [scrollbar-width:thin]">
				<Tabs.Content value="app">
					<AppTab/>
				</Tabs.Content>
				<Tabs.Content value="interface">
					<InterfaceTab/>
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
