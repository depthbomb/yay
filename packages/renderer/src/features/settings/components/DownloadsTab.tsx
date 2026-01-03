import { useSetting } from '~/hooks';
import { ESettingsKey } from 'shared';
import { Anchor } from '~/components/Anchor';
import { Switch } from '~/components/Switch';
import { KeyCombo } from '~/components/KeyCombo';
import { SectionSeparator } from './SectionSeparator';
import { Select, TextInput } from '~/components/Input';
import type { ChangeEvent } from 'react';

export const DownloadsTab = () => {
	const [downloadDir]                                         = useSetting<string>(ESettingsKey.DownloadDir);
	const [downloadNameTemplate, setDownloadNameTemplate]       = useSetting<string>(ESettingsKey.DownloadNameTemplate, { reactive: false });
	const [defaultDownloadAction, setDefaultDownloadAction]     = useSetting<string>(ESettingsKey.DefaultDownloadAction, { reactive: false });
	const [embedThumbnail, setEmbedThumbnail]                   = useSetting<boolean>(ESettingsKey.UseThumbnailForCoverArt, { reactive: false });
	const [enableNotifications, setEnableNotifications]         = useSetting<boolean>(ESettingsKey.EnableDownloadCompletionToast, { reactive: false });
	const [useNewTwitterDownloader, setUseNewTwitterDownloader] = useSetting<boolean>(ESettingsKey.UseNewTwitterVideoDownloader, { reactive: false });

	const onDefaultDownloadActionSelectionChanged = (event: ChangeEvent<HTMLSelectElement>) => setDefaultDownloadAction(event.target.value);
	const onDownloadNameTemplateFieldChanged      = (event: ChangeEvent<HTMLInputElement>) => setDownloadNameTemplate(event.target.value);

	return (
		<div className="flex flex-col space-y-6">
			<div className="flex flex-col items-start space-y-1.5">
				<h2 className="font-display">Download folder</h2>
				<TextInput value={downloadDir} onClick={() => window.ipc.invoke('main<-pick-download-dir')} type="text" readOnly className="w-full" size="sm"/>
				<Anchor onClick={() => window.ipc.invoke('main<-pick-download-dir')} className="text-xs cursor-pointer">Change...</Anchor>
			</div>
			<SectionSeparator/>
			<div className="flex flex-col items-start space-y-1.5">
				<h2 className="font-display">Output name template</h2>
				<TextInput value={downloadNameTemplate} onChange={onDownloadNameTemplateFieldChanged} type="text" className="w-full" size="sm"/>
				<p className="text-xs">Click <Anchor href="https://github.com/yt-dlp/yt-dlp?tab=readme-ov-file#output-template" target="_blank">here</Anchor> to learn more about output name templates</p>
			</div>
			<SectionSeparator/>
			<div className="flex flex-col items-start space-y-1.5">
				<h2 className="font-display">Default <KeyCombo keys={['enter']}/> action</h2>
				<Select value={defaultDownloadAction} onChange={onDefaultDownloadActionSelectionChanged} className="w-full" size="sm">
					<option value="video">Download video</option>
					<option value="audio">Download audio</option>
				</Select>
			</div>
			<SectionSeparator/>
			<Switch label="Use video thumbnail as audio cover art" checked={embedThumbnail} defaultChecked={embedThumbnail} onCheckedChange={setEmbedThumbnail}/>
			<Switch label="Completion toast notification" checked={enableNotifications} defaultChecked={enableNotifications} onCheckedChange={setEnableNotifications}/>
			<Switch label="Use the new Twitter/X video downloader" checked={useNewTwitterDownloader} defaultChecked={useNewTwitterDownloader} onCheckedChange={setUseNewTwitterDownloader}/>
		</div>
	);
};
