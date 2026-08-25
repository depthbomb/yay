import { Icon } from '@mdi/react';
import { mdiHeart, mdiUpdate } from '@mdi/js';
import { Section } from './Section';
import { useFeatureFlags } from '~/hooks';
import { useEffect, useState } from 'react';
import { Anchor } from '~/components/Anchor';
import { Button } from '~/components/Button';
import { SectionSeparator } from './SectionSeparator';
import { product, GIT_HASH, GIT_HASH_SHORT } from 'shared';
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
		const result = await window.ipc.invoke('updater<-get-next-manual-check');
		setNextManualCheck(result.data);
		setCanCheckForUpdates(Date.now() >= result.data);
	};

	const checkForUpdates = async () => {
		setChecking(true);
		try {
			const result = await window.ipc.invoke('updater<-check-manual');
			if (result.isErr) {
				await window.ipc.invoke('main<-show-message-box', {
					title: 'Update check failed',
					type: 'error',
					message: result.error,
				});
			} else if (!result.data) {
				await window.ipc.invoke('main<-show-message-box', {
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
		void window.ipc.invoke('updater<-get-next-manual-check').then(result => {
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
				['Commit', <Anchor href={`https://github.com/depthbomb/yay/commit/${GIT_HASH}`} target="_blank">{GIT_HASH_SHORT}</Anchor>],
				['Build date', window.buildDate.toLocaleString()],
				[
					'Repository',
					<Anchor href={product.repoURL} target="_blank" className="text-sm">
						<span>{product.repoURL}</span>
					</Anchor>
				]
			]}/>
			<InfoSection title="Framework" values={[
				['Electron version', window.versions.electron!],
				['Chrome version', window.versions.chrome!],
				['Node.js version', window.versions.node],
				['V8 version', window.versions.v8],
			]}/>
			<InfoSection title="System" values={[
				['Platform', `${window.system.type()} (${window.system.platform()})`],
				['Release', window.system.release()],
				['Architecture', window.system.arch()],
			]}/>
			<InfoSection title="Feature Flags" values={featureFlags.map(ff => [ff.description, ff.enabled.toString()])}/>
		</div>
	);
};
