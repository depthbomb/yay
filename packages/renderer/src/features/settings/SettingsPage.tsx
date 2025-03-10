import clsx from 'clsx';
import { useAtom } from 'jotai';
import { workingAtom } from '~/atoms/app';
import { AppTab } from './components/AppTab';
import { BinariesTab } from './components/BinariesTab';
import { useLocation, useNavigate } from 'react-router';
import { useState, useEffect, forwardRef } from 'react';
import { DownloadsTab } from './components/DownloadsTab';
import { DeveloperTab } from './components/DeveloperTab';
import type { ButtonHTMLAttributes } from 'react';

type TabButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	title: string;
	isActive: boolean;
};

const TabButton = forwardRef<HTMLButtonElement, TabButtonProps>(({ title, isActive, onClick, className, ...props }, ref) => {
	const css = clsx(
		'pt-0.5 px-2',
		'text-sm text-gray-300 hover:text-white',
		{
			'text-white! bg-brand-700 rounded': isActive,
			'bg-transparent hover:border-brand-600': !isActive
		},
		'border-b-2 border-transparent',
		'transition-all',
		className
	);

	const location    = useLocation();
	const navigate    = useNavigate();
	const [isWorking] = useAtom(workingAtom);

	useEffect(() => {
		if (isWorking && location.pathname !== '/') {
			navigate('/');
		}
	}, [isWorking]);

	return (
		<button
			ref={ref}
			onClick={onClick}
			className={css}
			{...props}
		>
			{title}
		</button>
	);
});

export const SettingsPage = () => {
	const [activeTab, setActiveTab] = useState(0);

	return (
		<div className="flex flex-col">
			<div className="p-3 flex space-x-2">
				<TabButton onClick={() => setActiveTab(0)} isActive={activeTab === 0} title="App"/>
				<TabButton onClick={() => setActiveTab(1)} isActive={activeTab === 1} title="Downloads"/>
				<TabButton onClick={() => setActiveTab(2)} isActive={activeTab === 2} title="Binaries"/>
				<TabButton onClick={() => setActiveTab(3)} isActive={activeTab === 3} title="Developer"/>
			</div>
			<div className="p-3">
				<div className={activeTab === 0 ? 'block' : 'hidden'}>
					<AppTab/>
				</div>
				<div className={activeTab === 1 ? 'block' : 'hidden'}>
					<DownloadsTab/>
				</div>
				<div className={activeTab === 2 ? 'block' : 'hidden'}>
					<BinariesTab/>
				</div>
				<div className={activeTab === 3 ? 'block' : 'hidden'}>
					<DeveloperTab/>
				</div>
			</div>
		</div>
	);
};
