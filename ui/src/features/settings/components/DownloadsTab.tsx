import { native } from '~/native';
import { Section } from './Section';
import { useSetting } from '~/hooks';
import { Anchor } from '~/components/Anchor';
import { Switch } from '~/components/Switch';
import { KeyCombo } from '~/components/KeyCombo';
import { SectionSeparator } from './SectionSeparator';
import { Select, TextInput } from '~/components/Input';
import { SettingsKey, RequestChannel } from '~/ipc/ipc.generated';
import type { ChangeEvent } from 'react';

export const DownloadsTab = () => {
	const [downloadDir]                                         = useSetting(SettingsKey.DownloadDir);
	const [downloadNameTemplate, setDownloadNameTemplate]       = useSetting(SettingsKey.DownloadNameTemplate, { reactive: false });
	const [defaultDownloadAction, setDefaultDownloadAction]     = useSetting(SettingsKey.DefaultDownloadAction, { reactive: false });
	const [embedThumbnail, setEmbedThumbnail]                   = useSetting(SettingsKey.UseThumbnailForCoverArt, { reactive: false });
	const [enableNotifications, setEnableNotifications]         = useSetting(SettingsKey.EnableDownloadCompletionToast, { reactive: false });
	const [useNewTwitterDownloader, setUseNewTwitterDownloader] = useSetting(SettingsKey.UseNewTwitterVideoDownloader, { reactive: false });

	const onDefaultDownloadActionSelectionChanged = (event: ChangeEvent<HTMLSelectElement>) => {
		const action = event.target.value;
		if (action === 'video' || action === 'audio') {
			void setDefaultDownloadAction(action);
		}
	};
	const onDownloadNameTemplateFieldChanged      = (event: ChangeEvent<HTMLInputElement>) => setDownloadNameTemplate(event.target.value);

	return (
		<div className="flex flex-col space-y-6">
			<Section title="Download folder">
				<TextInput value={downloadDir} onClick={() => native.ipc.invoke(RequestChannel.MainPickDownloadDir)} type="text" readOnly className="w-full" size="sm"/>
				<Anchor onClick={() => native.ipc.invoke(RequestChannel.MainPickDownloadDir)} className="text-xs cursor-pointer">Change...</Anchor>
			</Section>
			<SectionSeparator/>
			<Section title="Output name template">
				<TextInput value={downloadNameTemplate} onChange={onDownloadNameTemplateFieldChanged} type="text" className="w-full" size="sm"/>
				<p className="text-xs">Click <Anchor href="https://github.com/yt-dlp/yt-dlp?tab=readme-ov-file#output-template" target="_blank">here</Anchor> to learn more about output name templates</p>
			</Section>
			<SectionSeparator/>
			<Section title={<>Default <KeyCombo keys={['enter']}/> action</>}>
				<Select value={defaultDownloadAction} onChange={onDefaultDownloadActionSelectionChanged} className="w-full" size="sm">
					<option value="video">Download video</option>
					<option value="audio">Download audio</option>
				</Select>
			</Section>
			<SectionSeparator/>
			<Section>
				<Switch label="Use video thumbnail as audio cover art" checked={embedThumbnail} defaultChecked={embedThumbnail} onCheckedChange={setEmbedThumbnail}/>
				<Switch label="Completion toast notification" checked={enableNotifications} defaultChecked={enableNotifications} onCheckedChange={setEnableNotifications}/>
				<Switch label="Use the new Twitter/X video downloader" checked={useNewTwitterDownloader} defaultChecked={useNewTwitterDownloader} onCheckedChange={setUseNewTwitterDownloader}/>
			</Section>
		</div>
	);
};
