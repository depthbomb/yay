import Icon from '@mdi/react';
import { mdiGithub } from '@mdi/js';
import { Anchor } from '~/components/Anchor';
import { product, GIT_HASH, GIT_HASH_SHORT } from 'shared';
import type { FC, JSX } from 'react';

type InfoSectionProps = {
	title: string;
	values: Array<[string, string | JSX.Element]>;
};

const InfoSection: FC<InfoSectionProps> = ({ title, values }) => {
	return (
		<div className="w-full flex flex-col space-y-2">
			<h2>{title}</h2>
			<div className="py-2 px-3 space-y-1 w-full flex flex-col bg-gray-900 rounded-lg">
				{values.map(([valueName, value], i) => (
					<div key={i} className="flex flex-row items-center justify-between">
						<p className="text-sm font-bold">{valueName}</p>
						<p className="text-sm font-mono">{value}</p>
					</div>
				))}
			</div>
		</div>
	);
};

export const DevTab = () => {
	return (
		<div className="space-y-3 flex flex-col">
			<InfoSection title="Application" values={[
				['Product version', product.version],
				['Commit', <Anchor href={`https://github.com/depthbomb/yay/commit/${GIT_HASH}`} target="_blank">{GIT_HASH_SHORT}</Anchor>],
				['Build date', window.buildDate.toLocaleString()]
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
			<div className="space-x-3 flex items-center">
				<Anchor href="https://github.com/depthbomb/yay" target="_blank" className="text-sm">
					<Icon path={mdiGithub} className="size-4"/>
					<span>GitHub</span>
				</Anchor>
				{import.meta.env.DEV && (
					<Anchor className="text-sm" onClick={() => window.api.showUpdaterWindow()}>(DEV) Show updater window</Anchor>
				)}
			</div>
		</div>
	);
};
