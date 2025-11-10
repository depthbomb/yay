import { useSetting } from '~/hooks';
import { ESettingsKey } from 'shared';
import { Anchor } from '~/components/Anchor';
import { TextInput } from '~/components/input';
import { SwitchV2 } from '~/components/SwitchV2';
import type { Nullable } from 'shared';

export const YoutubeTab = () => {
	const [cookiesFilePath]                               = useSetting<Nullable<string>>(ESettingsKey.CookiesFilePath);
	const [skipYoutubePlaylists, setSkipYoutubePlaylists] = useSetting(ESettingsKey.SkipYoutubePlaylists, { defaultValue: true, reactive: false });

	return (
		<div className="flex flex-col space-y-6">
			<div className="flex flex-col items-start space-y-1.5">
				<p>Cookies file</p>
				<TextInput value={cookiesFilePath ?? 'None'} onClick={() => window.ipc.invoke('main<-pick-cookies-file')} type="text" readOnly className="w-full" size="small"/>
				<div className="w-full flex items-center justify-between">
					<Anchor onClick={() => window.ipc.invoke('main<-pick-cookies-file')} className="text-xs cursor-pointer">Change...</Anchor>
					{cookiesFilePath && <Anchor onClick={() => window.ipc.invoke('yt-dlp<-remove-cookies-file')} className="text-xs cursor-pointer">Remove</Anchor>}
				</div>
			</div>
			<SwitchV2 label="Don't download playlists" checked={skipYoutubePlaylists} defaultChecked={skipYoutubePlaylists} onCheckedChange={setSkipYoutubePlaylists}/>
		</div>
	);
};
