import { Icon } from '@mdi/react';
import { Section } from './Section';
import { useSetting } from '~/hooks';
import { ESettingsKey } from 'shared';
import { Button } from '~/components/Button';
import { CopyButton } from '~/components/CopyButton';
import { Switch } from '~/components/Switch';
import { TextInput } from '~/components/Input';
import { useState, useEffect } from 'react';
import { mdiEye, mdiEyeOff } from '@mdi/js';

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

	const [portInput, setPortInput]       = useState<string | null>(null);
	const [token, setToken]               = useState('');
	const [tokenVisible, setTokenVisible] = useState(false);

	useEffect(() => {
		window.ipc.invoke('rest<-get-api-token').then(result => setToken(result.data));
	}, []);

	const handleBlur = () => {
		const parsed = parsePort(portInput ?? '');
		if (parsed !== null) {
			setPort(parsed);
		}

		setPortInput(null);
	};

	return (
		<div className="flex flex-col space-y-6">
			<Section>
				<Switch label="Local API server" subtitle="Requires an app restart" checked={enabled} defaultChecked={enabled} onCheckedChange={setEnabled}/>
			</Section>
			<Section title="Port">
				<TextInput
					value={portInput ?? String(port)}
					onChange={e => setPortInput(e.target.value)}
					onBlur={handleBlur}
					type="string"
					className="w-full"
					disabled={!enabled}
					readOnly={!enabled}
					size="sm"
				/>
			</Section>
			<Section title="Bearer token">
				<div className="w-full flex items-center space-x-2">
					<TextInput
						aria-label="Local API bearer token"
						value={token}
						type={tokenVisible ? 'text' : 'password'}
						className="min-w-0 grow font-mono select-text"
						readOnly
						size="sm"
					/>
					<Button onClick={() => setTokenVisible(visible => !visible)} size="default">
						<Icon path={tokenVisible ? mdiEyeOff : mdiEye} className="size-4"/>
						<span>{tokenVisible ? 'Hide' : 'Show'}</span>
					</Button>
					<CopyButton value={token} size="default"/>
				</div>
				<p className="text-xs text-gray-400">Send this value in the <code>Authorization: Bearer</code> header.</p>
			</Section>
		</div>
	);
};
