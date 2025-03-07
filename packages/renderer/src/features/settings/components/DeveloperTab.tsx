import { product } from 'shared';
import type { FC } from 'react';

type InfoSectionProps = {
	title: string;
	values: Array<[string, string]>;
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

export const DeveloperTab = () => {
	return (
		<div className="w-full flex flex-col space-y-3">
			<InfoSection title="Application" values={[
				['Product version', product.version],
				['Commit', window.gitHash],
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
		</div>
	);
};
