import type { ITweetMedia } from './twitter';
import type { ESettingsKey } from './settings';
import type { Maybe, Nullable } from './types';
import type { Endpoints } from '@octokit/types';
import type { FeatureFlag } from './featureFlags';
import type { MessageBoxOptions, MessageBoxReturnValue } from 'electron';

export interface IIPCContract {
	'main<-show-message-box': {
		args: [options: MessageBoxOptions];
		return: MessageBoxReturnValue;
	}
	'main<-pick-download-dir': {
		args: [];
		return: Nullable<string>;
	}
	'main<-open-download-dir': {
		args: [];
		return: void;
	}
	'main<-pick-cookies-file': {
		args: [];
		return: Nullable<string>;
	}
	'main<-open-app-dir': {
		args: [];
		return: void;
	}
	'main<-open-app-data': {
		args: [];
		return: void;
	}
	'main<-open-external-url': {
		args: [url: string];
		return: void;
	}
	//
	'window<-minimize': {
		args: [window: string];
		return: void;
	}
	'window<-maximize': {
		args: [window: string];
		return: void;
	}
	'window<-unmaximize': {
		args: [window: string];
		return: void;
	}
	'window<-close': {
		args: [window: string];
		return: void;
	}
	//
	'setup<-show-window': {
		args: [];
		return: void;
	}
	'setup<-cancel': {
		args: [];
		return: void;
	}
	//
	'main-window<-toggle-pinned': {
		args: [];
		return: boolean;
	}
	//
	'settings<-set': {
		args: [key: ESettingsKey, value: any, secure?: boolean];
		return: void;
	}
	'settings<-get': {
		args: [key: ESettingsKey, defaultValue?: any, secure?: boolean];
		return: any;
	}
	'settings<-reset': {
		args: [];
		return: void;
	}
	'settings<-show-ui': {
		args: [];
		return: void;
	}
	//
	'yt-dlp<-download-video': {
		args: [url: string];
		return: void;
	}
	'yt-dlp<-download-audio': {
		args: [url: string];
		return: void;
	}
	'yt-dlp<-download-default': {
		args: [url: string];
		return: void;
	}
	'yt-dlp<-remove-cookies-file': {
		args: [];
		return: void;
	}
	'yt-dlp<-cancel-download': {
		args: [];
		return: void;
	}
	'yt-dlp<-recheck-binaries': {
		args: [];
		return: void;
	}
	'yt-dlp<-update-binary': {
		args: [];
		return: void;
	}
	//
	'twitter<-get-tweet-media-info': {
		args: [url: string];
		return: ITweetMedia;
	}
	'twitter<-download-media-url': {
		args: [url: string];
		return: void;
	}
	//
	'autostart<-enable': {
		args: [];
		return: boolean;
	}
	'autostart<-disable': {
		args: [];
		return: boolean;
	}
	'autostart<-toggle': {
		args: [];
		return: boolean;
	}
	//
	'global-menu<-download-from-clipboard': {
		args: [audio: boolean];
		return: void;
	}
	'global-menu<-open-download-dir': {
		args: [];
		return: void;
	}
	//
	'updater<-check-manual': {
		args: [];
		return: void;
	}
	'updater<-get-next-manual-check': {
		args: [];
		return: number;
	}
	'updater<-get-latest-release': {
		args: [];
		return: Maybe<any>;
	}
	'updater<-get-latest-changelog': {
		args: [];
		return: Nullable<string>;
	}
	'updater<-get-commits-since-build': {
		args: [];
		return: Nullable<Endpoints['GET /repos/{owner}/{repo}/commits']['response']['data']>;
	}
	'updater<-show-window': {
		args: [];
		return: void;
	}
	'updater<-update': {
		args: [];
		return: void;
	}
	'updater<-cancel-update': {
		args: [];
		return: void;
	}
	//
	'feature-flag<-get-feature-flags': {
		args: [];
		return: FeatureFlag[];
	}
	//
	'theming<-get-accent-color': {
		args: [];
		return: string;
	}
	//
	'thumbnail<-clear-cache': {
		args: [];
		return: void;
	}
}

export interface IIPCEvents {
	// Main Events
	'main->heartbeat': number; // Only emitted in development mode
	// Window Events
	'window->is-minimized': void;
	'window->is-maximized': void;
	'window->is-unmaximized': void;
	'window->is-blurred': void;
	'window->is-focused': void;
	'window->is-closed': { windowName: string; };
	// Setup Events
	'setup->step': { message: string; progress: number; };
	'setup->done': void;
	// Settings Events
	'settings->changed': { key: ESettingsKey; value: any };
	// yt-dlp Events
	'yt-dlp->download-started': { url: string; };
	'yt-dlp->download-canceled': void;
	'yt-dlp->download-finished': void;
	'yt-dlp->stdout': { line: string; };
	'yt-dlp->updating-binary': void;
	'yt-dlp->updated-binary': void;
	// Updater Events
	'updater->outdated': { latestRelease: any; };
	'updater->show-window': void;
	'updater->checking-for-updates': void;
	'updater->update-step': { message: string; };
	'updater->update-complete': void;
	// Theming Events
	'theming->accent-color-changed': { accentColor: string; };
}
