import Icon from '@mdi/react';
import { useIpc } from '~/hooks';
import remarkGfm from 'remark-gfm';
import { IpcChannel } from 'shared';
import Markdown from 'react-markdown';
import { useState, useEffect } from 'react';
import { Spinner } from '~/components/Spinner';
import { mdiNewBox, mdiDownload } from '@mdi/js';
import { PushButton } from '~/components/PushButton';
import type { Nullable } from 'shared';
import type { Components } from 'react-markdown';

const markdownComponents = {
	ul(props) {
		return (
			<div className="py-1 px-2">{props.children}</div>
		);
	},
	li(props) {
		return (
			<p className="py-1 px-2 space-x-3"><span className="font-black">&bull;</span><span>{props.children}</span></p>
		);
	}
} satisfies Components;

const defaultStatus = 'Updating...' as const;

export const UpdaterPage = () => {
	const [updating, setUpdating] = useState(false);
	const [status, setStatus]     = useState(defaultStatus);
	const [release, setRelease]   = useState<Nullable<Awaited<ReturnType<typeof window.api.getLatestRelease>>>>(null);
	const [onUpdateStep]          = useIpc(IpcChannel.UpdateStep);

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
		onUpdateStep(setStatus);
	}, []);

	return (
		<div className="p-4 space-y-4 w-screen h-screen flex flex-col bg-black">
			{release ? (
				<>
					<div className="space-x-2 flex items-center">
						<Icon path={mdiNewBox} className="mr-2 inline size-9 text-[color:var(--os-accent)]"/>
						<h1 className="text-2xl">Version {release.tag_name} is available</h1>
					</div>
					<div className="bg-gray-800 rounded overflow-hidden">
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
								<Icon path={mdiDownload} className="size-4"/>
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
