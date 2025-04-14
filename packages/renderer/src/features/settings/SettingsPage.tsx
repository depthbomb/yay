import clsx from 'clsx';
import { Tabs } from 'radix-ui';
import { AppTab } from './components/AppTab';
import { DevTab } from './components/DevTab';
import { AdvancedTab } from './components/AdvancedTab';
import { DownloadsTab } from './components/DownloadsTab';
import type { FC, ButtonHTMLAttributes } from 'react';

type TabButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	value: string;
};

const TabButton: FC<TabButtonProps> = ({ value, className, ...props }) => {
	const css = clsx(
		'py-0.25 px-3',
		'text-sm text-gray-300 hover:text-white',
		'data-[state=active]:text-white! data-[state=active]:bg-brand-700 data-[state=active]:rounded',
		'data-[state=inactive]:bg-transparent data-[state=inactive]:hover:border-l-brand-700',
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
	return (
		<Tabs.Root defaultValue="app" orientation="vertical" className="h-screen flex items-stretch bg-gray-950">
			<Tabs.List className="p-3 space-y-1.5 w-32 flex flex-col shrink-0 bg-gray-900">
				<TabButton value="app">
					Application
				</TabButton>
				<TabButton value="downloads">
					Downloads
				</TabButton>
				<TabButton value="advanced">
					Advanced
				</TabButton>
				<TabButton value="dev">
					Developer
				</TabButton>
			</Tabs.List>
			<div className="p-3 size-full overflow-y-auto [scrollbar-width:thin]">
				<Tabs.Content value="app">
					<AppTab/>
				</Tabs.Content>
				<Tabs.Content value="downloads">
					<DownloadsTab/>
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
