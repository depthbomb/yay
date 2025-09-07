import clsx from 'clsx';
import Icon from '@mdi/react';
import { Tabs } from 'radix-ui';
import { mdiDownload } from '@mdi/js';
import { useIpc, useTitle } from '~/hooks';
import { useState, useEffect } from 'react';
import { Spinner } from '~/components/SpinnerV2';
import { PushButton } from '~/components/PushButton';
import type { FC } from 'react';
import type { Nullable } from 'shared';
import type { Endpoints } from '@octokit/types';

type TabButtonProps = Tabs.TabsTriggerProps;

const TabButton: FC<TabButtonProps> = ({ value, className, ...props }) => {
	const css = clsx(
		'py-0.25 px-3',
		'text-sm text-gray-300 hover:text-white',
		'data-[state=active]:text-white! data-[state=active]:bg-brand-500 data-[state=active]:rounded',
		'data-[state=inactive]:bg-transparent data-[state=inactive]:hover:border-b-brand-500',
		'border-2 border-transparent',
		'transition-all',
		className
	);

	return (
		<Tabs.Trigger value={value} className={css}>
			{props.children}
		</Tabs.Trigger>
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

	useTitle('Updater');

	useEffect(() => {
		window.ipc.invoke('updater<-get-latest-release').then(setRelease);
	}, []);

	useEffect(() => {
		window.ipc.invoke('updater<-get-latest-changelog').then(changelog => setChangelog(changelog ?? 'No changelog available'));
	}, []);

	useEffect(() => {
		window.ipc.invoke('updater<-get-commits-since-build').then(commits => setCommits(commits ?? []));
	}, []);

	useEffect(() => onUpdateStep(({ message }) => setStatus(message ?? 'Updating...')), []);

	return (release ? (
		<Tabs.Root defaultValue="changelog" className="p-4 space-y-4 w-screen h-screen flex flex-col bg-black">
			<h1 className="text-2xl">yay version <span className="font-mono">{release.tag_name}</span> is available</h1>
			<Tabs.List className="space-x-1.5 flex shrink-0">
				<TabButton value="changelog">Changelog</TabButton>
				<TabButton value="commits">Commits since your version</TabButton>
			</Tabs.List>
			<div className="w-full overflow-y-auto rounded-lg">
				<Tabs.Content value="changelog">
					<div dangerouslySetInnerHTML={{ __html: changelog }}/>
				</Tabs.Content>
				<Tabs.Content value="commits">
					<div className="flex flex-col">
						{commits.map(c => (
							<a key={c.sha} href={c.html_url} target="_blank" className="p-3 space-x-2 flex items-center bg-gray-800 odd:bg-gray-900 hover:bg-gray-700 active:bg-gray-950 transition-colors">
								<img src={c.author?.avatar_url} className="w-8 rounded-full" loading="lazy" draggable="false"/>
								<p><span className="font-bold">{c.author?.login}</span> <span className="font-mono">{c.commit.message}</span></p>
								<p className="ml-auto text-sm font-mono text-gray-400">{c.sha.slice(0, 7)}</p>
							</a>
						))}
					</div>
				</Tabs.Content>
			</div>
			<div className="mt-auto flex items-center justify-between">
				{updating ? (
					<>
						<div className="space-x-2 flex items-center">
							<Spinner className="size-6"/>
							<p>{status}</p>
						</div>
						<PushButton onClick={onCancelButtonClicked} variant="danger" size="lg">Cancel</PushButton>
					</>
				) : (
					<PushButton onClick={onDownloadButtonClicked} variant='brand' size="lg" className="ml-auto">
						<Icon path={mdiDownload} className="size-5"/>
						<span>Download &amp; install</span>
					</PushButton>
				)}
			</div>
		</Tabs.Root>
	) : (
		<div className="space-y-3 h-screen flex flex-col items-center justify-center">
			<Spinner className="size-18"/>
			<p>Checking for new releases&hellip;</p>
		</div>
	));
};

export default UpdaterPage;
