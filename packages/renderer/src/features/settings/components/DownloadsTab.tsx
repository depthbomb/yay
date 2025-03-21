import clsx from 'clsx';
import Icon from '@mdi/react';
import { SettingsKey } from 'shared';
import { mdiVolumeHigh } from '@mdi/js';
import { useState, useEffect } from 'react';
import { KeyCombo } from '~/components/KeyCombo';
import { useSetting, useThrottle } from '~/hooks';
import { Select, TextInput } from '~/components/input';
import type { ChangeEvent } from 'react';

export const DownloadsTab = () => {
	const [downloadDir]                                     = useSetting<string>(SettingsKey.DownloadDir);
	const [downloadNameTemplate, setDownloadNameTemplate]   = useSetting<string>(SettingsKey.DownloadNameTemplate);
	const [defaultDownloadAction, setDefaultDownloadAction] = useSetting<string>(SettingsKey.DefaultDownloadAction);
	const [notificationId, setNotificationId]               = useSetting<number>(SettingsKey.NotificationSoundId);
	const [testSoundEnabled, setTestSoundEnabled]           = useState(true);
	const playNotificationSound                             = useThrottle(window.api.playNotificationSound, 1_000);

	const onDefaultDownloadActionSelectionChanged = (event: ChangeEvent<HTMLSelectElement>) => setDefaultDownloadAction(event.target.value);

	const onDownloadNameTemplateFieldChanged = (event: ChangeEvent<HTMLInputElement>) => setDownloadNameTemplate(event.target.value.trim());

	const onNotificationSoundSelectionChanged = (event: ChangeEvent<HTMLSelectElement>) => setNotificationId(Number.parseInt(event.target.value));

	useEffect(() => setTestSoundEnabled(notificationId > 0), [notificationId]);

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
				<p>Download completion sound</p>
				<div className="space-x-3 flex items-center">
					<Select value={notificationId} onChange={onNotificationSoundSelectionChanged} size="small">
						<option value="0">Disabled</option>
						<option value="1">1</option>
						<option value="2">2</option>
						<option value="3">3</option>
					</Select>
					<button
						className={
							clsx(
								'space-x-1 flex items-center text-xs cursor-pointer',
								{
									'text-brand-600 hover:text-brand-500 active:text-brand-700': testSoundEnabled,
									'text-gray-300 cursor-not-allowed!': !testSoundEnabled,
								}
							)
						}
						onClick={() => testSoundEnabled && playNotificationSound()}
						disabled={!testSoundEnabled}
						type="button">
						<Icon path={mdiVolumeHigh} className="shrink-0 size-4"/>
						<span className="shrink-0">Listen</span>
					</button>
				</div>
			</div>
		</div>
	);
};
