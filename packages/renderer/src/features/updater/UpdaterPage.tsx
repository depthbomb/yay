import { cx } from 'cva';
import Icon from '@mdi/react';
import { useIpc } from '~/hooks';
import { mdiDownload } from '@mdi/js';
import { HTML } from '~/components/HTML';
import { useState, useEffect } from 'react';
import { Button } from '~/components/Button';
import { Spinner } from '~/components/SpinnerV2';
import { WindowShell } from '~/components/WindowShell';
import { Root, List, Trigger, Content } from '@radix-ui/react-tabs';
import type { FC } from 'react';
import type { Nullable } from 'shared';
import type { Endpoints } from '@octokit/types';
import type { TabsTriggerProps } from '@radix-ui/react-tabs';

type TabButtonProps = TabsTriggerProps;

const TabButton: FC<TabButtonProps> = ({ value, className, ...props }) => {
	return (
		<Trigger value={value} className={cx(
			'py-px px-3 font-display text-sm border-2 border-transparent transition-all',
			'data-[state=inactive]:text-gray-300 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:border-b-accent-600',
			'data-[state=active]:text-accent-600-contrast data-[state=active]:bg-accent-600 data-[state=active]:rounded-xs',
			className,
		)}>
			{props.children}
		</Trigger>
	);
};

const defaultStatus = 'Updating...';

export const UpdaterPage = () => {
	const [updating, setUpdating]   = useState(false);
	const [status, setStatus]       = useState(defaultStatus);
	const [release, setRelease]     = useState<Nullable<Endpoints['GET /repos/{owner}/{repo}/releases']['response']['data'][number]>>(null);
	const [changelog, setChangelog] = useState('');
	const [commits, setCommits]     = useState<Endpoints['GET /repos/{owner}/{repo}/commits']['response']['data']>([]);
	const [onUpdateStep]            = useIpc('updater->update-step');

	const onDownloadButtonClicked = async () => {
		setUpdating(true);
		await window.ipc.invoke('updater<-update');
	}

	const onCancelButtonClicked = async () => {
		await window.ipc.invoke('updater<-cancel-update');
		setUpdating(false);
		setStatus(defaultStatus);
	}

	useEffect(() => {
		window.ipc.invoke('updater<-get-latest-release').then(setRelease);
	}, []);

	useEffect(() => {
		window.ipc.invoke('updater<-get-latest-changelog').then(changelog => setChangelog(changelog ?? ''));
	}, []);

	useEffect(() => {
		window.ipc.invoke('updater<-get-commits-since-build').then(commits => setCommits(commits ?? []));
	}, []);

	useEffect(() => onUpdateStep(({ message }) => setStatus(message ?? 'Updating...')), []);

	return (
		<WindowShell windowName="updater" title="Updater">
			{release ? (
			<Root defaultValue="changelog" className="p-4 space-y-4 size-full flex flex-col bg-gray-950">
				<h1 className="font-display text-2xl">yay version <span className="font-mono">{release.tag_name}</span> is available</h1>
				<List className="space-x-1.5 flex shrink-0">
					<TabButton value="changelog">Changelog</TabButton>
					<TabButton value="commits">Commits since your version</TabButton>
				</List>
				<div className="size-full flex overflow-y-auto">
					<Content value="changelog" className="p-1.5 size-full bg-gray-900 border border-gray-800 rounded-xs shadow">
						{changelog !== '' ? (<HTML html={changelog}/>) : (
							<p className="py-3 text-2xl font-light">No changelog available.</p>
						)}
					</Content>
					<Content value="commits" className="flex flex-col rounded overflow-auto">
						{commits.map(c => (
							<a key={c.sha} href={c.html_url} target="_blank" className="p-3 space-x-2.5 flex items-center bg-gray-900 odd:bg-black/25 hover:bg-gray-700 active:bg-gray-950 transition-colors">
								<img src={c.author?.avatar_url} className="w-8 rounded-full" loading="lazy" draggable="false"/>
								<span className="font-display">{c.author?.login}</span>
								<span className="font-mono">{c.commit.message}</span>
								<p className="ml-auto text-sm font-mono text-gray-300">{c.sha.slice(0, 7)}</p>
							</a>
						))}
					</Content>
				</div>
				<div className="mt-auto flex items-center justify-between">
					{updating ? (
						<>
							<div className="space-x-2 flex items-center">
								<Spinner className="size-6"/>
								<p>{status}</p>
							</div>
							<Button onClick={onCancelButtonClicked} type="danger">Cancel</Button>
						</>
					) : (
						<Button onClick={onDownloadButtonClicked} className="ml-auto" size="lg">
							<Icon path={mdiDownload} className="size-5"/>
							<span>Download &amp; install</span>
						</Button>
					)}
				</div>
			</Root>
		) : (
			<div className="space-y-3 h-screen flex flex-col items-center justify-center">
				<Spinner className="size-18"/>
				<p>Checking for new releases&hellip;</p>
			</div>
		)}
		</WindowShell>
	);
};

export default UpdaterPage;
