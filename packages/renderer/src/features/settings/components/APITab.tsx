import { Section } from './Section';
import { useSetting } from '~/hooks';
import { ESettingsKey } from 'shared';
import { useState, useEffect } from 'react';
import { Switch } from '~/components/Switch';
import { TextInput } from '~/components/Input';

const MIN_PORT = 1 as const;
const MAX_PORT = 65535 as const;

const parsePort = (input: string) => {
	const value = Number(input.trim());
	if (!Number.isInteger(value)) {
		return null;
	}

	if (value < MIN_PORT || value > MAX_PORT) {
		return null;
	}

	return value;
};

export const APITab = () => {
	const [port, setPort]       = useSetting<number>(ESettingsKey.LocalApiServerPort, { reactive: false });
	const [enabled, setEnabled] = useSetting<boolean>(ESettingsKey.EnableLocalApiServer, { reactive: false });

	const [portInput, setPortInput] = useState(String(port));

	useEffect(() => {
		setPortInput(String(port));
	}, [port]);

	const handleBlur = () => {
		const parsed = parsePort(portInput);
		if (parsed !== null) {
			setPort(parsed);
		} else {
			setPortInput(String(port));
		}
	};

	return (
		<div className="flex flex-col space-y-6">
			<Section>
				<Switch label="Local API server" subtitle="Requires an app restart" checked={enabled} defaultChecked={enabled} onCheckedChange={setEnabled}/>
			</Section>
			<Section title="Port">
				<TextInput
					value={portInput}
					onChange={e => setPortInput(e.target.value)}
					onBlur={handleBlur}
					type="string"
					className="w-full"
					disabled={!enabled}
					readOnly={!enabled}
					size="sm"
				/>
			</Section>
		</div>
	);
};
