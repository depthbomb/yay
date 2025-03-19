import Icon from '@mdi/react';
import { mdiGithub } from '@mdi/js';
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
			<div className="p-2 w-full flex flex-col space-y-1 border border-white rounded">
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

export const DevInfoPage = () => {
	return (
		<div className="p-3 w-full flex flex-col space-y-3">
			<InfoSection title="Application" values={[
				['Product version', product.version],
				['Commit', <a href={`https://github.com/depthbomb/yay/commit/${GIT_HASH}`} target="_blank">{GIT_HASH_SHORT}</a>],
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
			<a href="https://github.com/depthbomb/yay" target="_blank" className="space-x-0.5 flex items-center">
				<Icon path={mdiGithub} className="size-5"/>
				<span>GitHub</span>
			</a>
		</div>
	);
};
