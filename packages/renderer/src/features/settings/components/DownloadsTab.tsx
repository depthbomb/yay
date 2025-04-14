import { useSetting } from '~/hooks';
import { SettingsKey } from 'shared';
import { Switch } from '~/components/Switch';
import { KeyCombo } from '~/components/KeyCombo';
import { Select, TextInput } from '~/components/input';
import type { ChangeEvent } from 'react';

export const DownloadsTab = () => {
	const [downloadDir]                                     = useSetting<string>(SettingsKey.DownloadDir);
	const [downloadNameTemplate, setDownloadNameTemplate]   = useSetting<string>(SettingsKey.DownloadNameTemplate, { reactive: false });
	const [defaultDownloadAction, setDefaultDownloadAction] = useSetting<string>(SettingsKey.DefaultDownloadAction, { reactive: false });
	const [enableNotifications, setEnableNotifications]     = useSetting(SettingsKey.EnableDownloadCompletionToast, { defaultValue: true, reactive: false });
	const [skipYoutubePlaylists, setSkipYoutubePlaylists]   = useSetting(SettingsKey.SkipYoutubePlaylists, { defaultValue: true, reactive: false });

	const onDefaultDownloadActionSelectionChanged = (event: ChangeEvent<HTMLSelectElement>) => setDefaultDownloadAction(event.target.value);

	const onDownloadNameTemplateFieldChanged = (event: ChangeEvent<HTMLInputElement>) => setDownloadNameTemplate(event.target.value);

	return (
		<div className="flex flex-col space-y-6">
			<div className="flex flex-col items-start space-y-1.5">
				<p>Download folder</p>
				<TextInput value={downloadDir} onClick={() => window.api.openDownloadDirPicker()} type="text" readOnly className="w-full" size="small"/>
				<a onClick={() => window.api.openDownloadDirPicker()} className="w-auto text-xs cursor-pointer">Change...</a>
			</div>
			<div className="flex flex-col items-start space-y-1.5">
				<p>Output name template</p>
				<TextInput value={downloadNameTemplate} onChange={onDownloadNameTemplateFieldChanged} type="text" className="w-full" size="small"/>
				<p className="w-auto text-xs">Click <a href="https://github.com/yt-dlp/yt-dlp?tab=readme-ov-file#output-template" target="_blank" >here</a> to learn more about output name templates</p>
			</div>
			<div className="flex flex-col items-start space-y-1.5">
				<p>Default <KeyCombo keys={['enter']}/> action</p>
				<Select value={defaultDownloadAction} onChange={onDefaultDownloadActionSelectionChanged} className="w-full" size="small">
					<option value="video">Download video</option>
					<option value="audio">Download audio</option>
				</Select>
			</div>
			<div className="flex flex-col items-start space-y-1.5">
				<p>Completion toast notification</p>
				<Switch checked={enableNotifications} defaultChecked={enableNotifications} onCheckedChange={setEnableNotifications}/>
			</div>
			<div className="flex flex-col items-start space-y-1.5">
				<p>Don't download YouTube playlists</p>
				<Switch checked={skipYoutubePlaylists} defaultChecked={skipYoutubePlaylists} onCheckedChange={setSkipYoutubePlaylists}/>
			</div>
		</div>
	);
};
