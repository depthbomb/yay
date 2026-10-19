import { Icon } from '@mdi/react';
import { native } from '~/native';
import { Section } from './Section';
import { useSetting } from '~/hooks';
import { mdiTrashCan } from '@mdi/js';
import { useState, useEffect } from 'react';
import { Anchor } from '~/components/Anchor';
import { Button } from '~/components/Button';
import { Switch } from '~/components/Switch';
import { TextInput } from '~/components/Input';
import { SectionSeparator } from './SectionSeparator';
import { SettingsKey, RequestChannel } from '~/ipc/ipc.generated';

export const YoutubeTab = () => {
	const [canClearThumbnails, setCanClearThumbnails]     = useState(true);
	const [cookiesFilePath]                               = useSetting(SettingsKey.CookiesFilePath);
	const [skipYoutubePlaylists, setSkipYoutubePlaylists] = useSetting(SettingsKey.SkipYoutubePlaylists, { reactive: false });

	const clearThumbnailCache = async () => {
		setCanClearThumbnails(false);
		await native.ipc.invoke(RequestChannel.ThumbnailClearCache);
	};

	useEffect(() => {
		if (!canClearThumbnails) {
			setTimeout(() => setCanClearThumbnails(true), 5_000);
		}
	}, [canClearThumbnails]);

	return (
		<div className="flex flex-col items space-y-6">
			<Section title="Cookies file">
				<TextInput value={cookiesFilePath ?? 'None'} onClick={() => native.ipc.invoke(RequestChannel.MainPickCookiesFile)} type="text" readOnly className="w-full" size="sm"/>
				<div className="w-full flex items-center justify-between">
					<Anchor onClick={() => native.ipc.invoke(RequestChannel.MainPickCookiesFile)} className="text-xs cursor-pointer">Change...</Anchor>
					{cookiesFilePath && <Anchor onClick={() => native.ipc.invoke(RequestChannel.YtDlpRemoveCookiesFile)} className="text-xs cursor-pointer">Remove</Anchor>}
				</div>
			</Section>
			<SectionSeparator/>
			<Switch label="Don't download playlists" checked={skipYoutubePlaylists} defaultChecked={skipYoutubePlaylists} onCheckedChange={setSkipYoutubePlaylists}/>
			<SectionSeparator/>
			<div className="flex">
				<Button type="danger" onClick={() => clearThumbnailCache()} disabled={!canClearThumbnails}>
					<Icon path={mdiTrashCan} className="size-4"/>
					<span>Clear thumbnail cache</span>
				</Button>
			</div>
		</div>
	);
};
