import { Icon } from '@mdi/react';
import { Section } from './Section';
import { useFeatureFlags } from '~/hooks';
import { useState, useEffect } from 'react';
import { Anchor } from '~/components/Anchor';
import { Button } from '~/components/Button';
import { mdiHeart, mdiUpdate } from '@mdi/js';
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
	const [canCheckUpdates, setCanCheckUpdates] = useState(false);
	const [nextUpdateCheck, setNextUpdateCheck] = useState<Date>();
	const [,featureFlags]                       = useFeatureFlags();

	const checkForUpdates = async () => {
		setCanCheckUpdates(false);
		await window.ipc.invoke('updater<-check-manual');
	};

	const getNextUpdateCheck = () => {
		window.ipc.invoke('updater<-get-next-manual-check').then(nextCheckTimestamp => {
			setNextUpdateCheck(new Date(nextCheckTimestamp.data));
			setCanCheckUpdates(Date.now() >= nextCheckTimestamp.data);
		});
	};

	useEffect(() => {
		const timer = setInterval(getNextUpdateCheck, 1_000);

		getNextUpdateCheck();

		return () => clearInterval(timer);
	}, []);

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
				<Button onClick={() => checkForUpdates()} size="lg" disabled={!canCheckUpdates}>
					<Icon path={mdiUpdate} className="size-4"/>
					<span>Check for updates</span>
				</Button>
				<p>Next check: <span className="font-mono text-sm">{nextUpdateCheck?.toLocaleString()}</span></p>
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
				['Electron version', window.versions.electron],
				['Chrome version', window.versions.chrome],
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
