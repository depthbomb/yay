import { useIpc, useTitle } from '~/hooks';
import { useState, useEffect } from 'react';
import { Spinner } from '~/components/SpinnerV2';
import { Titlebar } from './components/Titlebar';

export const SetupPage = () => {
	const [setupStep, setSetupStep] = useState('Checking requirements...');
	const [onSetupStep]             = useIpc('setup->step');

	useTitle('yay setup');

	useEffect(() => {
		const removeListener = onSetupStep(({ message }) => setSetupStep(message));
		return () => removeListener();
	}, []);

	return (
		<div className="relative flex flex-col justify-center h-screen w-screen bg-[url('~/assets/img/setup-bg.jpg')] bg-no-repeat border border-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] overflow-hidden">
			<Titlebar title="yay setup"/>
			<div className="h-full draggable"/>
			<div className="p-2 space-x-2 flex flex-row items-center draggable">
				<Spinner className="size-5"/>
				<p className="text-sm font-mono">{setupStep}</p>
			</div>
		</div>
	);
};
