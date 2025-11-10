import { useSetting } from '~/hooks';
import { ESettingsKey } from 'shared';
import { Anchor } from '~/components/Anchor';
import { SwitchV2 } from '~/components/SwitchV2';
import { KeyCombo } from '~/components/KeyCombo';
import { Select, TextInput } from '~/components/input';
import type { ChangeEvent } from 'react';

export const DownloadsTab = () => {
	const [downloadDir]                                     = useSetting<string>(ESettingsKey.DownloadDir);
	const [downloadNameTemplate, setDownloadNameTemplate]   = useSetting<string>(ESettingsKey.DownloadNameTemplate, { reactive: false });
	const [defaultDownloadAction, setDefaultDownloadAction] = useSetting<string>(ESettingsKey.DefaultDownloadAction, { reactive: false });
	const [embedThumbnail, setEmbedThumbnail]               = useSetting<boolean>(ESettingsKey.UseThumbnailForCoverArt, { reactive: false });
	const [enableNotifications, setEnableNotifications]     = useSetting<boolean>(ESettingsKey.EnableDownloadCompletionToast, { defaultValue: true, reactive: false });

	const onDefaultDownloadActionSelectionChanged = (event: ChangeEvent<HTMLSelectElement>) => setDefaultDownloadAction(event.target.value);
	const onDownloadNameTemplateFieldChanged      = (event: ChangeEvent<HTMLInputElement>) => setDownloadNameTemplate(event.target.value);

	return (
		<div className="flex flex-col space-y-6">
			<div className="flex flex-col items-start space-y-1.5">
				<p>Download folder</p>
				<TextInput value={downloadDir} onClick={() => window.ipc.invoke('main<-pick-download-dir')} type="text" readOnly className="w-full" size="small"/>
				<Anchor onClick={() => window.ipc.invoke('main<-pick-download-dir')} className="text-xs cursor-pointer">Change...</Anchor>
			</div>
			<div className="flex flex-col items-start space-y-1.5">
				<p>Output name template</p>
				<TextInput value={downloadNameTemplate} onChange={onDownloadNameTemplateFieldChanged} type="text" className="w-full" size="small"/>
				<p className="text-xs">Click <Anchor href="https://github.com/yt-dlp/yt-dlp?tab=readme-ov-file#output-template" target="_blank">here</Anchor> to learn more about output name templates</p>
			</div>
			<div className="flex flex-col items-start space-y-1.5">
				<p>Default <KeyCombo keys={['enter']}/> action</p>
				<Select value={defaultDownloadAction} onChange={onDefaultDownloadActionSelectionChanged} className="w-full" size="small">
					<option value="video">Download video</option>
					<option value="audio">Download audio</option>
				</Select>
			</div>
			<SwitchV2 label="Use video thumbnail as audio cover art" checked={embedThumbnail} defaultChecked={embedThumbnail} onCheckedChange={setEmbedThumbnail}/>
			<SwitchV2 label="Completion toast notification" checked={enableNotifications} defaultChecked={enableNotifications} onCheckedChange={setEnableNotifications}/>
		</div>
	);
};
