import { useIpc } from '~/hooks';
import { Logo } from '~/components/Logo';
import { useState, useEffect } from 'react';
import { Spinner } from '~/components/SpinnerV2';
import { WindowShell } from '~/components/WindowShell';
import { ProgressBar } from './components/ProgressBar';

export const SetupPage = () => {
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
		<WindowShell title="yay setup" windowName="setup" minimizeButton={false} maximizeButton={false}>
			<div className="space-y-3 h-full flex flex-col items-center justify-center draggable">
				<Logo type="lockup" className="w-56 h-auto"/>
				<div className="p-2 space-x-2 flex flex-row items-center draggable">
					{!done && <Spinner className="size-5"/>}
					<p className="font-mono text-sm">{step}</p>
				</div>
				<ProgressBar
					state={progressState}
					value={progress > -1 ? progress : 0}
					className="w-64"/>
			</div>
		</WindowShell>
	);
};
