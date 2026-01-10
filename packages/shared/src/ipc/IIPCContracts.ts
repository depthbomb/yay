import type { ITweetMedia } from '../twitter';
import type { ESettingsKey } from '../settings';
import type { Maybe, Nullable } from '../types';
import type { Endpoints } from '@octokit/types';
import type { FeatureFlag } from '../featureFlags';
import type { Unit, IPCResult } from './ipc-result';
import type { MessageBoxOptions, MessageBoxReturnValue } from 'electron';

export interface IIPCContract {
	'main<-show-message-box': {
		args: [options: MessageBoxOptions];
		return: IPCResult<MessageBoxReturnValue, never>;
	}
	'main<-pick-download-dir': {
		args: [];
		return: IPCResult<Nullable<string>, never>;
	}
	'main<-open-download-dir': {
		args: [];
		return: IPCResult<Unit, never>;
	}
	'main<-pick-cookies-file': {
		args: [];
		return: IPCResult<Nullable<string>, never>;
	}
	'main<-open-app-dir': {
		args: [];
		return: IPCResult<Unit, never>;
	}
	'main<-open-app-data': {
		args: [];
		return: IPCResult<Unit, never>;
	}
	'main<-open-external-url': {
		args: [url: string];
		return: IPCResult<Unit, never>;
	}
	//
	'window<-minimize': {
		args: [window: string];
		return: IPCResult<Unit, never>;
	}
	'window<-maximize': {
		args: [window: string];
		return: IPCResult<Unit, never>;
	}
	'window<-unmaximize': {
		args: [window: string];
		return: IPCResult<Unit, never>;
	}
	'window<-close': {
		args: [window: string];
		return: IPCResult<Unit, never>;
	}
	//
	'setup<-show-window': {
		args: [];
		return: IPCResult<Unit, never>;
	}
	'setup<-cancel': {
		args: [];
		return: IPCResult<Unit, never>;
	}
	//
	'main-window<-toggle-pinned': {
		args: [];
		return: IPCResult<boolean, never>;
	}
	//
	'settings<-set': {
		args: [key: ESettingsKey, value: any, secure?: boolean];
		return: IPCResult<Unit, never>;
	}
	'settings<-get': {
		args: [key: ESettingsKey, defaultValue?: any, secure?: boolean];
		return: IPCResult<any, never>;
	}
	'settings<-reset': {
		args: [];
		return: IPCResult<Unit, never>;
	}
	'settings<-import': {
		args: [];
		return: IPCResult<Unit, string>;
	}
	'settings<-export': {
		args: [];
		return: IPCResult<string, string>;
	}
	'settings<-show-ui': {
		args: [];
		return: IPCResult<Unit, never>;
	}
	//
	'yt-dlp<-download-video': {
		args: [url: string];
		return: IPCResult<Unit, never>;
	}
	'yt-dlp<-download-audio': {
		args: [url: string];
		return: IPCResult<Unit, never>;
	}
	'yt-dlp<-download-default': {
		args: [url: string];
		return: IPCResult<Unit, never>;
	}
	'yt-dlp<-remove-cookies-file': {
		args: [];
		return: IPCResult<Unit, never>;
	}
	'yt-dlp<-cancel-download': {
		args: [];
		return: IPCResult<Unit, never>;
	}
	'yt-dlp<-recheck-binaries': {
		args: [];
		return: IPCResult<Unit, never>;
	}
	'yt-dlp<-update-binary': {
		args: [];
		return: IPCResult<Unit, never>;
	}
	//
	'twitter<-get-tweet-media-info': {
		args: [url: string];
		return: IPCResult<Nullable<ITweetMedia>, never>;
	}
	'twitter<-download-media-url': {
		args: [url: string];
		return: IPCResult<Unit, string>;
	}
	//
	'autostart<-enable': {
		args: [];
		return: IPCResult<boolean, never>;
	}
	'autostart<-disable': {
		args: [];
		return: IPCResult<boolean, never>;
	}
	'autostart<-toggle': {
		args: [];
		return: IPCResult<boolean, never>;
	}
	//
	'global-menu<-download-from-clipboard': {
		args: [audio: boolean];
		return: IPCResult<Unit, never>;
	}
	'global-menu<-open-download-dir': {
		args: [];
		return: IPCResult<Unit, never>;
	}
	//
	'updater<-check-manual': {
		args: [];
		return: IPCResult<Unit, never>;
	}
	'updater<-get-next-manual-check': {
		args: [];
		return: IPCResult<number, never>;
	}
	'updater<-get-latest-release': {
		args: [];
		return: IPCResult<Maybe<any>, never>;
	}
	'updater<-get-latest-changelog': {
		args: [];
		return: IPCResult<Nullable<string>, never>;
	}
	'updater<-get-commits-since-build': {
		args: [];
		return: IPCResult<Nullable<Endpoints['GET /repos/{owner}/{repo}/commits']['response']['data']>, never>;
	}
	'updater<-show-window': {
		args: [];
		return: IPCResult<Unit, never>;
	}
	'updater<-update': {
		args: [];
		return: IPCResult<Unit, string>;
	}
	'updater<-cancel-update': {
		args: [];
		return: IPCResult<Unit, never>;
	}
	//
	'feature-flag<-get-feature-flags': {
		args: [];
		return: IPCResult<FeatureFlag[], never>;
	}
	//
	'theming<-get-accent-color': {
		args: [];
		return: IPCResult<string, never>;
	}
	//
	'thumbnail<-clear-cache': {
		args: [];
		return: IPCResult<Unit, never>;
	}
}
