import clsx from 'clsx';
import Icon from '@mdi/react';
import { useAtom } from 'jotai';
import { Link } from 'react-router';
import { mdiRestore } from '@mdi/js';
import { workingAtom } from '~/atoms/app';
import { AppTab } from './components/AppTab';
import { Button } from '~/components/Button';
import { BinariesTab } from './components/BinariesTab';
import { useLocation, useNavigate } from 'react-router';
import { useState, useEffect, forwardRef } from 'react';
import { DownloadsTab } from './components/DownloadsTab';
import type { ButtonHTMLAttributes } from 'react';

type TabButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	title: string;
	isActive: boolean;
};

const onResetSettingsButtonClicked = async () => {
	const { response } = await window.api.showMessageBox({
		type: 'info',
		title: 'Reset settings',
		message: 'Your settings will be reset to their defaults and yay will restart.\nWould you like to continue?',
		buttons: ['Yes', 'No'],
		defaultId: 0
	});

	if (response === 0) {
		await window.api.resetSettings();
	}
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
		<div className="h-full flex flex-col">
			<div className="p-3 flex space-x-2">
				<TabButton onClick={() => setActiveTab(0)} isActive={activeTab === 0} title="App"/>
				<TabButton onClick={() => setActiveTab(1)} isActive={activeTab === 1} title="Downloads"/>
				<TabButton onClick={() => setActiveTab(2)} isActive={activeTab === 2} title="Binaries"/>
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
			</div>
			<div className="mt-auto mr-3 mb-3 ml-3 flex items-center justify-between">
				<Button variant="danger" onClick={onResetSettingsButtonClicked}>
					<Icon path={mdiRestore} className="size-4"/>
					<span>Reset settings</span>
				</Button>
				<Link to="/dev-info" className="text-xs">Developer info</Link>
			</div>
		</div>
	);
};
