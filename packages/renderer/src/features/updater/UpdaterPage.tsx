import Icon from '@mdi/react';
import { useIpc } from '~/hooks';
import remarkGfm from 'remark-gfm';
import { IpcChannel } from 'shared';
import Markdown from 'react-markdown';
import { mdiDownload } from '@mdi/js';
import { useState, useEffect } from 'react';
import { Spinner } from '~/components/Spinner';
import { PushButton } from '~/components/PushButton';
import type { Nullable } from 'shared';
import type { Components } from 'react-markdown';

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
			<a href={props.href} target="_blank">{props.children}</a>
		);
	}
} satisfies Components;

const defaultStatus = 'Updating...' as const;

export const UpdaterPage = () => {
	const [updating, setUpdating] = useState(false);
	const [status, setStatus]     = useState(defaultStatus);
	const [release, setRelease]   = useState<Nullable<Awaited<ReturnType<typeof window.api.getLatestRelease>>>>(null);
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

	useEffect(() => onUpdateStep(setStatus), []);

	return (
		<div className="p-4 space-y-4 w-screen h-screen flex flex-col bg-black">
			{release ? (
				<>
					<h1 className="text-2xl">yay version <span className="font-mono">{release.tag_name}</span> is available</h1>
					<div className="bg-gray-800 rounded-lg overflow-hidden">
						<Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{release.body}</Markdown>
					</div>
					<div className="mt-auto w-full flex items-center">
						{updating && (
							<div className="space-x-2 flex items-center">
								<Spinner className="size-5"/>
								<p>{status}</p>
							</div>
						)}
						{updating ? (
							<PushButton onClick={onCancelButtonClicked} className="ml-auto" variant="danger" size="lg">Cancel</PushButton>
						) : (
							<PushButton onClick={onDownloadButtonClicked} className="ml-auto" variant='brand' size="lg" disabled={updating}>
								<Icon path={mdiDownload} className="size-5"/>
								<span>Download &amp; install</span>
							</PushButton>
						)}
					</div>
				</>
			) : (
				<div className="h-full flex items-center justify-center">
					<Spinner className="size-16"/>
				</div>
			)}
		</div>
	);
};
