import { useIpc } from '~/hooks';
import { IpcChannel } from 'shared';
import { useState, useEffect } from 'react';
import { Spinner } from './components/Spinner';
import { Titlebar } from './components/Titlebar';

export const SetupPage = () => {
	const [setupStep, setSetupStep]           = useState('Checking requirements...');
	const [cancelDisabled, setCancelDisabled] = useState(false);
	const [onSetupStep]                       = useIpc(IpcChannel.SetupStep);

	const onCancelButtonClicked = async () => {
		setCancelDisabled(true);
		await window.api.cancelSetup();
	};

	useEffect(() => {
		const removeListener = onSetupStep((step: string) => setSetupStep(step));
		return () => removeListener();
	}, []);

	return (
		<div className="relative flex flex-col justify-center h-screen w-screen [background:linear-gradient(to_bottom,black,transparent),_linear-gradient(to_right,#FF0033,#FF2790)] border border-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] overflow-hidden">
			<Titlebar title="yay setup"/>
			<div className="space-y-4 flex flex-col items-center justify-center">
				<Spinner lineWidth={2} className="size-18"/>
				<p className="text-sm font-mono">{setupStep}</p>
				<button
					onClick={onCancelButtonClicked}
					className="w-14 h-5.5 text-xs text-black bg-white rounded shadow-lg hover:bg-gray-200 active:bg-gray-300 disabled:opacity-50"
					type="button"
					disabled={cancelDisabled}
				>Cancel</button>
			</div>
		</div>
	);
};
