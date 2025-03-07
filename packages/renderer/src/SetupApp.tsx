import { useIpc } from './hooks';
import { IpcChannel } from 'shared';
import { useState, useEffect } from 'react';

export const SetupApp = () => {
	const [setupStep, setSetupStep]           = useState('Performing setup...');
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
		<div className="p-3 flex flex-col w-screen h-screen bg-[url(/assets/img/setup-bg.jpg)] bg-cover">
			<div className="h-full draggable"></div>
			<div className="flex flex-row items-center">
				<p className="text-sm font-mono shrink-0 draggable">{setupStep}</p>
				<div className="w-full h-auto draggable"></div>
				<button
					onClick={onCancelButtonClicked}
					className="shrink-0 w-14 h-5.5 text-xs bg-brand-600 rounded hover:bg-brand-500 active:bg-brand-700 disabled:opacity-50"
					type="button"
					disabled={cancelDisabled}
				>Cancel</button>
			</div>
		</div>
	);
};
