import clsx from 'clsx';
import { useAtom } from 'jotai';
import { Link } from 'react-router';
import { workingAtom } from '~/atoms/app';
import { AppTab } from './components/AppTab';
import { AdvancedTab } from './components/AdvancedTab';
import { useLocation, useNavigate } from 'react-router';
import { useState, useEffect, forwardRef } from 'react';
import { DownloadsTab } from './components/DownloadsTab';
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
			type="button"
		>
			{title}
		</button>
	);
});

export const SettingsPage = () => {
	const [activeTab, setActiveTab] = useState(0);

	return (
		<div className="h-full flex flex-col">
			<div className="p-3 space-x-2 flex items-center">
				<TabButton onClick={() => setActiveTab(0)} isActive={activeTab === 0} title="App"/>
				<TabButton onClick={() => setActiveTab(1)} isActive={activeTab === 1} title="Downloads"/>
				<TabButton onClick={() => setActiveTab(2)} isActive={activeTab === 2} title="Advanced"/>

			</div>
			<div className="p-3">
				<div className={activeTab === 0 ? 'block' : 'hidden'}>
					<AppTab/>
				</div>
				<div className={activeTab === 1 ? 'block' : 'hidden'}>
					<DownloadsTab/>
				</div>
				<div className={activeTab === 2 ? 'block' : 'hidden'}>
					<AdvancedTab/>
				</div>
			</div>
			<div className="mt-auto mr-3 mb-3 ml-3 flex items-center justify-end">
				<Link to="/dev-info" className="text-xs">Developer info</Link>
			</div>
		</div>
	);
};
