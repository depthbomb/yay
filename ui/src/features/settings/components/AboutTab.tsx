import { Icon } from '@mdi/react';
import { native } from '~/native';
import { Section } from './Section';
import { useFeatureFlags } from '~/hooks';
import { useState, useEffect } from 'react';
import { Anchor } from '~/components/Anchor';
import { Button } from '~/components/Button';
import { mdiHeart, mdiUpdate } from '@mdi/js';
import { product } from '~/product.generated';
import { RequestChannel } from '~/ipc/ipc.generated';
import { SectionSeparator } from './SectionSeparator';
import { GIT_HASH, GIT_HASH_SHORT } from '~/constants';
import type { FC, JSX } from 'react';

type InfoSectionProps = {
	title: string;
	values: Array<[string, string | JSX.Element]>;
};

const InfoSection: FC<InfoSectionProps> = ({ title, values }) => {
	return (
		<Section title={title}>
			<div className="py-2 px-3 space-y-1 w-full flex flex-col bg-gray-900 rounded border border-gray-800 shadow">
				{values.map(([valueName, value], i) => (
					<div key={i} className="flex flex-row items-center justify-between">
						<p className="text-sm font-bold">{valueName}</p>
						<p className="text-sm font-mono">{value}</p>
					</div>
				))}
			</div>
		</Section>
	);
};

export const AboutTab = () => {
	const [,featureFlags] = useFeatureFlags();
	const [checking, setChecking] = useState(false);
	const [nextManualCheck, setNextManualCheck] = useState(0);
	const [canCheckForUpdates, setCanCheckForUpdates] = useState(true);

	const refreshNextCheck = async () => {
		const result = await native.ipc.invoke(RequestChannel.UpdaterGetNextManualCheck);
		setNextManualCheck(result.data);
		setCanCheckForUpdates(Date.now() >= result.data);
	};

	const checkForUpdates = async () => {
		setChecking(true);
		try {
			const result = await native.ipc.invoke(RequestChannel.UpdaterCheckManual);
			if (result.isErr) {
				await native.ipc.invoke(RequestChannel.MainShowMessageBox, {
					title: 'Update check failed',
					type: 'error',
					message: result.error,
				});
			} else if (!result.data) {
				await native.ipc.invoke(RequestChannel.MainShowMessageBox, {
					title: 'Application updater',
					type: 'info',
					message: 'You are using the latest version of yay.',
				});
			}
		} finally {
			await refreshNextCheck();
			setChecking(false);
		}
	};

	useEffect(() => {
		let active = true;
		void native.ipc.invoke(RequestChannel.UpdaterGetNextManualCheck).then(result => {
			if (active) {
				setNextManualCheck(result.data);
				setCanCheckForUpdates(Date.now() >= result.data);
			}
		});
		return () => {
			active = false;
		};
	}, []);

	useEffect(() => {
		const delay = nextManualCheck - Date.now();
		if (delay <= 0) {
			return;
		}

		const timer = setTimeout(() => setCanCheckForUpdates(true), delay);
		return () => clearTimeout(timer);
	}, [nextManualCheck]);

	return (
		<div className="space-y-6 flex flex-col">
			<div className="pt-3 flex flex-col items-center">
				<p className="space-x-1 flex items-center text-lg">
					<span>Built with</span>
					<Icon path={mdiHeart} className="inline size-6 text-rose-500 animate-heartbeat"/>
					<span>by</span>
					<Anchor href="https://github.com/depthbomb" target="_blank">
						<img src={`https://avatars.githubusercontent.com/u/6052766?v=${GIT_HASH}`} width="24" height="24" alt="depthbomb" className="inline size-6 rounded-full shadow" draggable="false"/>
						<span>depthbomb</span>
					</Anchor>
				</p>
			</div>
			<SectionSeparator/>
			<Section>
				<div className="flex space-x-4 items-center">
					<Button onClick={() => void checkForUpdates()} size="lg" disabled={checking || !canCheckForUpdates}>
						<Icon path={mdiUpdate} className="size-4"/>
						<span>{checking ? 'Checking for updates...' : 'Check for updates'}</span>
					</Button>
					{!canCheckForUpdates && (
						<p className="text-sm">Next check: <span className="font-mono">{new Date(nextManualCheck).toLocaleTimeString()}</span></p>
					)}
				</div>
			</Section>
			<SectionSeparator/>
			<InfoSection title="Application" values={[
				['Product version', product.version],
				['WebView2 version', native.versions.webview2],
				['Commit', <Anchor href={`https://github.com/depthbomb/yay/commit/${GIT_HASH}`} target="_blank">{GIT_HASH_SHORT}</Anchor>],
				['Build date', native.buildDate.toLocaleString()],
				[
					'Repository',
					<Anchor href={product.repositoryUrl} target="_blank" className="text-sm">
						<span>{product.repositoryUrl}</span>
					</Anchor>
				]
			]}/>
			<InfoSection title="System" values={[
				['Platform', `${native.system.type} (${native.system.platform})`],
				['Release', native.system.release],
				['Architecture', native.system.arch],
			]}/>
			<InfoSection title="Feature Flags" values={featureFlags.map(ff => [ff.description, ff.enabled.toString()])}/>
		</div>
	);
};

