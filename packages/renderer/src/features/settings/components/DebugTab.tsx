import { Section } from './Section';
import { Anchor } from '~/components/Anchor';
import { SectionSeparator } from './SectionSeparator';

export const DebugTab = () => {
	return (
		<div className="space-y-6 flex flex-col">
			<Section title="Accent Color Palette">
				<div className="space-y-2 flex flex-col">
				<div className="py-1 px-2 w-full bg-accent-50 rounded border border-accent-950">
					<p className="text-accent-50-contrast">contrasting text</p>
				</div>
				<div className="py-1 px-2 w-full bg-accent-100 rounded border border-accent-900">
					<p className="text-accent-100-contrast">contrasting text</p>
				</div>
				<div className="py-1 px-2 w-full bg-accent-200 rounded border border-accent-800">
					<p className="text-accent-200-contrast">contrasting text</p>
				</div>
				<div className="py-1 px-2 w-full bg-accent-300 rounded border border-accent-700">
					<p className="text-accent-300-contrast">contrasting text</p>
				</div>
				<div className="py-1 px-2 w-full bg-accent-400 rounded border border-accent-600">
					<p className="text-accent-400-contrast">contrasting text</p>
				</div>
				<div className="py-1 px-2 w-full bg-accent-500 rounded border border-accent-500">
					<p className="text-accent-500-contrast">contrasting text</p>
				</div>
				<div className="py-1 px-2 w-full bg-accent-600 rounded border border-accent-400">
					<p className="text-accent-600-contrast">contrasting text</p>
				</div>
				<div className="py-1 px-2 w-full bg-accent-700 rounded border border-accent-300">
					<p className="text-accent-700-contrast">contrasting text</p>
				</div>
				<div className="py-1 px-2 w-full bg-accent-800 rounded border border-accent-200">
					<p className="text-accent-800-contrast">contrasting text</p>
				</div>
				<div className="py-1 px-2 w-full bg-accent-900 rounded border border-accent-100">
					<p className="text-accent-900-contrast">contrasting text</p>
				</div>
				<div className="py-1 px-2 w-full bg-accent-950 rounded border border-accent-50">
					<p className="text-accent-950-contrast">contrasting text</p>
				</div>
			</div>
			</Section>
			<SectionSeparator/>
			<Anchor onClick={() => window.ipc.invoke('updater<-show-window')}>Show updater window</Anchor>
			<Anchor onClick={() => window.ipc.invoke('setup<-show-window')}>Show setup window</Anchor>
		</div>
	);
};

export default DebugTab;
