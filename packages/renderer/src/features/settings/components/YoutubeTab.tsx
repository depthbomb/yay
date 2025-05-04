import { useSetting } from '~/hooks';
import { SettingsKey } from 'shared';
import { Switch } from '~/components/Switch';
import { Anchor } from '~/components/Anchor';
import { TextInput } from '~/components/input';
import type { Nullable } from 'shared';

export const YoutubeTab = () => {
	const [cookiesFilePath]                               = useSetting<Nullable<string>>(SettingsKey.CookiesFilePath);
	const [skipYoutubePlaylists, setSkipYoutubePlaylists] = useSetting(SettingsKey.SkipYoutubePlaylists, { defaultValue: true, reactive: false });

	return (
		<div className="flex flex-col space-y-6">
			<div className="flex flex-col items-start space-y-1.5">
				<p>Cookies file</p>
				<TextInput value={cookiesFilePath ?? 'None'} onClick={() => window.api.openCookiesFilePicker()} type="text" readOnly className="w-full" size="small"/>
				<div className="w-full flex items-center justify-between">
					<Anchor onClick={() => window.api.openCookiesFilePicker()} className="text-xs cursor-pointer">Change...</Anchor>
					{cookiesFilePath && <Anchor onClick={() => window.api.removeCookiesFile()} className="text-xs cursor-pointer">Remove</Anchor>}
				</div>
			</div>
			<div className="flex flex-col items-start space-y-1.5">
				<p>Don't download playlists</p>
				<Switch checked={skipYoutubePlaylists} defaultChecked={skipYoutubePlaylists} onCheckedChange={setSkipYoutubePlaylists}/>
			</div>
		</div>
	);
};
