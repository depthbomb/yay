import type { Nullable } from './types';
import type { ESettingsKey } from './settings';
import type { Endpoints } from '@octokit/types';
import type { FeatureFlag } from './featureFlags';
import type { MessageBoxOptions, MessageBoxReturnValue } from 'electron';

export interface IIpcContract {
	'main<-show-message-box': {
		args: [options: MessageBoxOptions];
		return: MessageBoxReturnValue;
	}
	'main<-show-text-selection-menu': {
		args: [type: 'input' | 'input-selection' | 'text-selection'];
		return: void;
	}
	//
	'window<-minimize': {
		args: [];
		return: void;
	}
	//
	'setup<-cancel': {
		args: [];
		return: void;
	}
	//
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
	'main<-toggle-window-pinned': {
		args: [];
		return: boolean;
	}
	'main<-open-log-file': {
		args: [];
		return: void;
	}
	'main<-open-app-data': {
		args: [];
		return: void;
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
	'global-menu<-enable': {
		args: [];
		return: void;
	}
	'global-menu<-disable': {
		args: [];
		return: void;
	}
	'global-menu<-toggle': {
		args: [];
		return: boolean;
	}
	//
	'updater<-get-latest-release': {
		args: [];
		return: Nullable<Endpoints['GET /repos/{owner}/{repo}/releases']['response']['data'][number]>;
	}
	'updater<-get-latest-changelog': {
		args: [];
		return: Nullable<string>;
	}
	'updater<-get-commits-since-build': {
		args: [];
		return: Nullable<Endpoints['GET /repos/{owner}/{repo}/commits']['response']['data']>;
	}
	'updater<-check-for-updates': {
		args: [];
		return: boolean;
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
}

export interface IIpcEvents {
	// Window Events
	'window->is-blurred': void;
	'window->is-focused': void;
	// Setup Events
	'setup->step': { message: string; };
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
	'updater->outdated': { latestRelease: Endpoints['GET /repos/{owner}/{repo}/releases']['response']['data'][number]; };
	'updater->show-window': void;
	'updater->checking-for-updates': void;
	'updater->update-step': { message: string; };
	'updater->update-complete': void;
}
