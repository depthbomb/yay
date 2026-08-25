import { cx } from 'cva';
import { Icon } from '@mdi/react';
import remarkGfm from 'remark-gfm';
import { mdiDownload } from '@mdi/js';
import { useIPCEvent } from '~/hooks';
import ReactMarkdown from 'react-markdown';
import { Button } from '~/components/Button';
import { Spinner } from '~/components/SpinnerV2';
import { useRef, useState, useEffect } from 'react';
import { WindowShell } from '~/components/WindowShell';
import { List, Root, Content, Trigger } from '@radix-ui/react-tabs';
import type { FC } from 'react';
import type { TabsTriggerProps } from '@radix-ui/react-tabs';
import type { Nullable, GitHubCommit, GitHubRelease } from 'shared';

const TabButton: FC<TabsTriggerProps> = ({ className, ...props }) => (
	<Trigger className={cx(
		'py-px px-3 font-display text-sm border-2 border-transparent transition-all',
		'data-[state=inactive]:text-gray-300 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:border-b-accent-600',
		'data-[state=active]:text-accent-600-contrast data-[state=active]:bg-accent-600 data-[state=active]:rounded-xs',
		className,
	)} {...props}/>
);

export const UpdaterPage = () => {
	const [updating, setUpdating] = useState(false);
	const [status, setStatus] = useState('Preparing update...');
	const [error, setError] = useState<string>();
	const [release, setRelease] = useState<Nullable<GitHubRelease>>(null);
	const [changelog, setChangelog] = useState('');
	const [commits, setCommits] = useState<Nullable<GitHubCommit[]>>(null);
	const loadingCommits = useRef(false);

	useIPCEvent('updater->update-step', ({ message }) => setStatus(message));

	useEffect(() => {
		let active = true;
		void window.ipc.invoke('updater<-get-latest-release').then(releaseResult => {
			if (!active) {
				return;
			}
			setRelease(releaseResult.data);
			setChangelog(releaseResult.data?.body ?? '');
		});

		return () => {
			active = false;
		};
	}, []);

	const loadCommits = async () => {
		if (commits !== null || loadingCommits.current) {
			return;
		}

		loadingCommits.current = true;
		try {
			const result = await window.ipc.invoke('updater<-get-commits-since-build');
			setCommits(result.data ?? []);
		} finally {
			loadingCommits.current = false;
		}
	};

	const startUpdate = async () => {
		setError(undefined);
		setUpdating(true);
		try {
			const result = await window.ipc.invoke('updater<-update');
			if (result.isErr) {
				setError(result.error);
			}
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : String(cause));
		} finally {
			setUpdating(false);
		}
	};

	const cancelUpdate = async () => {
		setStatus('Cancelling update...');
		await window.ipc.invoke('updater<-cancel-update');
	};

	return (
		<WindowShell windowName="updater" title="Updater" titlebarClassName="bg-[color-mix(in_srgb,var(--color-gray-950)_50%,black)]">
			{release ? (
				<Root defaultValue="changelog" onValueChange={value => value === 'commits' && void loadCommits()} className="p-4 space-y-4 size-full flex flex-col bg-gray-950/40">
					<h1 className="font-display text-2xl">yay version <span className="font-mono">{release.tag_name}</span> is available</h1>
					<List className="space-x-1.5 flex shrink-0">
						<TabButton value="changelog">Changelog</TabButton>
						<TabButton value="commits">Commits since your version</TabButton>
					</List>
					<Content value="changelog" className="p-3 size-full bg-gray-900/75 rounded-xs border border-gray-800 shadow overflow-y-auto">
						{changelog ? (
							<div className="prose prose-p:text-white prose-li:text-white prose-headings:text-white prose-strong:text-white prose-a:text-brand-500 prose-a:hover:text-brand-400 prose-a:active:text-brand-600 prose-code:text-white prose-pre:bg-black/40 prose-table:text-white max-w-none">
								<ReactMarkdown
									remarkPlugins={[remarkGfm]}
									components={{
										a: props => <a {...props} target="_blank" rel="noreferrer"/>,
									}}
								>
									{changelog}
								</ReactMarkdown>
							</div>
						) : <p>No changelog is available.</p>}
					</Content>
					<Content value="commits" className="w-full flex flex-col rounded-xs border border-gray-800 shadow overflow-y-auto">
						{commits === null ? (
							<div className="p-3 space-x-2 flex items-center"><Spinner className="size-5"/><span>Loading commits...</span></div>
						) : commits.length > 0 ? commits.map(commit => (
							<a key={commit.sha} href={commit.html_url} target="_blank" rel="noreferrer" className="p-3 space-x-2.5 flex items-center bg-gray-900 odd:bg-black/25 hover:bg-gray-700 active:bg-gray-950 transition-colors">
								{commit.author && <img src={commit.author.avatar_url} className="size-8 rounded-full" loading="lazy" draggable="false"/>}
								<span className="font-display">{commit.author?.login ?? 'Unknown author'}</span>
								<span className="font-mono wrap-anywhere">{commit.commit.message}</span>
								<span className="ml-auto text-sm font-mono text-gray-300">{commit.sha.slice(0, 7)}</span>
							</a>
						)) : <p className="p-3">No commit history is available.</p>}
					</Content>
					{error && <p role="alert" className="text-sm text-red-400">{error}</p>}
					<div className="mt-auto flex items-center justify-between">
						{updating ? (
							<>
								<div className="space-x-2 flex items-center"><Spinner className="size-6"/><p>{status}</p></div>
								<Button onClick={() => void cancelUpdate()} size="lg" type="danger">Cancel</Button>
							</>
						) : (
							<Button onClick={() => void startUpdate()} className="ml-auto" size="lg">
								<Icon path={mdiDownload} className="size-5"/>
								<span>Download &amp; install</span>
							</Button>
						)}
					</div>
				</Root>
			) : (
				<div className="space-y-3 h-full flex flex-col items-center justify-center">
					<Spinner className="size-18"/>
					<p>Loading update information...</p>
				</div>
			)}
		</WindowShell>
	);
};

export default UpdaterPage;
