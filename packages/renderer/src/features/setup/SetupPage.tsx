import { Logo } from '~/components/Logo';
import { useIpc, useTitle } from '~/hooks';
import { Spinner } from '~/components/SpinnerV2';
import { Titlebar } from '~/components/Titlebar';
import { ProgressBar } from './components/ProgressBar';
import { useState, useEffect } from 'react';

export const SetupPage = () => {
	useTitle('yay setup');

	const [state, setState] = useState({
		done: false,
		step: 'Checking requirements...',
		progress: -1,
	});

	const [onSetupDone] = useIpc('setup->done');
	const [onSetupStep] = useIpc('setup->step');

	useEffect(() => {
		const removeStep = onSetupStep(({ message, progress }) =>
			setState(s => ({ ...s, step: message, progress }))
		);

		const removeDone = onSetupDone(() =>
			setState(s => ({ ...s, done: true }))
		);

		return () => {
			removeStep();
			removeDone();
		};
	}, [onSetupStep, onSetupDone]);

	const { done, step, progress } = state;
	const progressState            = done ? 'done' : progress > -1 ? 'active' : 'indeterminate';

	return (
		<div className="relative flex flex-col justify-center h-screen w-screen bg-gray-950 border border-accent-500 overflow-hidden">
			<Titlebar windowName="setup" maximizeButton={false}/>
			<div className="space-y-3 h-full flex flex-col items-center justify-center draggable">
				<Logo type="lockup" className="w-56 h-auto"/>
				<div className="p-2 space-x-2 flex flex-row items-center draggable">
					{!done && <Spinner className="size-6"/>}
					<p className="font-mono">{step}</p>
				</div>
				<ProgressBar
					state={progressState}
					value={progress > -1 ? progress : 0}
					className="w-64"/>
			</div>
		</div>
	);
};
