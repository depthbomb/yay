import clsx from 'clsx';
import Icon from '@mdi/react';
import { Tabs } from 'radix-ui';
import { useIpc } from '~/hooks';
import remarkGfm from 'remark-gfm';
import { IpcChannel } from 'shared';
import Markdown from 'react-markdown';
import { mdiDownload } from '@mdi/js';
import { useState, useEffect } from 'react';
import { Anchor } from '~/components/Anchor';
import { Spinner } from '~/components/Spinner';
import { PushButton } from '~/components/PushButton';
import type { FC } from 'react';
import type { Nullable } from 'shared';
import type { Endpoints } from '@octokit/types';
import type { Components } from 'react-markdown';

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

const markdownComponents = {
	ul(props) {
		return (
			<div className="flex flex-col">{props.children}</div>
		);
	},
	li(props) {
		return (
			<div className="pl-4 py-2 space-x-3 odd:bg-gray-900">{props.children}</div>
		);
	},
	a(props) {
		return (
			<Anchor href={props.href} target="_blank">{props.children}</Anchor>
		);
	}
} satisfies Components;

const defaultStatus = 'Updating...' as const;

export const UpdaterPage = () => {
	const [updating, setUpdating] = useState(false);
	const [status, setStatus]     = useState(defaultStatus);
	const [release, setRelease]   = useState<Nullable<Endpoints['GET /repos/{owner}/{repo}/releases']['response']['data'][number]>>(null);
	const [commits, setCommits]   = useState<Endpoints['GET /repos/{owner}/{repo}/commits']['response']['data']>([]);
	const [onUpdateStep]          = useIpc(IpcChannel.Updater_Step);

	const onDownloadButtonClicked = async () => {
		setUpdating(true);
		await window.api.startUpdate();
	}

	const onCancelButtonClicked = async () => {
		await window.api.cancelUpdate();
		setUpdating(false);
		setStatus(defaultStatus);
	}

	useEffect(() => {
		window.api.getLatestRelease().then(setRelease);
	}, []);

	useEffect(() => {
		window.api.getCommitsSinceBuild().then(setCommits);
	}, []);

	useEffect(() => onUpdateStep(setStatus), []);

	return (release ? (
		<Tabs.Root defaultValue="changelog" className="p-4 space-y-4 w-screen h-screen flex flex-col bg-black">
			<h1 className="text-2xl">yay version <span className="font-mono">{release.tag_name}</span> is available</h1>
			<Tabs.List className="space-x-1.5 flex shrink-0">
				<TabButton value="changelog">
					Changelog
				</TabButton>
				<TabButton value="commits">
					Commits since your version
				</TabButton>
			</Tabs.List>
			<div className="size-full overflow-y-auto rounded-lg">
				<Tabs.Content value="changelog" className="bg-gray-800">
					<Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{release.body}</Markdown>
				</Tabs.Content>
				<Tabs.Content value="commits">
					<div className="flex flex-col">
						{commits.map(c => (
							<a key={c.sha} href={c.html_url} target="_blank" className="p-3 space-x-2 flex items-center bg-gray-800 odd:bg-gray-900 hover:bg-gray-700 active:bg-gray-950 transition-colors">
								<img src={c.author?.avatar_url} className="w-8 rounded-full" loading="lazy" draggable="false"/>
								<p><span className="font-bold">{c.author?.login}</span> committed <span className="font-mono">{c.commit.message}</span></p>
								<p className="ml-auto text-sm font-mono text-gray-400">{c.sha.slice(0, 7)}</p>
							</a>
						))}
					</div>
				</Tabs.Content>
			</div>
			<div className="flex items-center justify-between">
				{updating ? (
					<>
						<div className="space-x-2 flex items-center">
							<Spinner className="size-5"/>
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
		<div className="h-full flex items-center justify-center">
			<Spinner className="size-16"/>
		</div>
	));
};
