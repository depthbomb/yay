// export enum IpcChannel {
// 	ShowMessageBox        = 'show-message-box',
// 	ShowTextSelectionMenu = 'show-text-selection-menu',
// 	//
// 	Window_Minimize  = 'window:minimize',
// 	Window_IsBlurred = 'window:is-blurred',
// 	Window_IsFocused = 'window:is-focused',
// 	// Setup channels
// 	Setup_Step   = 'setup:step',
// 	Setup_Cancel = 'setup:cancel',
// 	// Main Window channels
// 	Main_PickDownloadDir    = 'main:pick-download-dir',
// 	Main_OpenDownloadDir    = 'main:open-download-dir',
// 	Main_PickCookiesFile    = 'main:pick-cookies-file',
// 	Main_ToggleWindowPinned = 'main:toggle-window-pinned',
// 	Main_OpenLogFile        = 'main:open-log-file',
// 	Main_OpenAppData        = 'main:open-app-data',
// 	// Settings channels
// 	Settings_Changed = 'settings:changed',
// 	Settings_Set     = 'settings:set',
// 	Settings_Get     = 'settings:get',
// 	Settings_Reset   = 'settings:reset',
// 	Settings_ShowUi  = 'settings:show-ui',
// 	// yt-dlp channels
// 	Ytdlp_DownloadVideo     = 'yt-dlp:download-video',
// 	Ytdlp_DownloadAudio     = 'yt-dlp:download-audio',
// 	Ytdlp_DownloadDefault   = 'yt-dlp:download-default',
// 	Ytdlp_RemoveCookiesFile = 'yt-dlp:remove-cookies-file',
// 	Ytdlp_DownloadStarted   = 'yt-dlp:download-started',
// 	Ytdlp_CancelDownload    = 'yt-dlp:cancel-download',
// 	Ytdlp_DownloadCanceled  = 'yt-dlp:download-canceled',
// 	Ytdlp_DownloadFinished  = 'yt-dlp:download-finished',
// 	Ytdlp_Stdout            = 'yt-dlp:stdout',
// 	Ytdlp_RecheckBinaries   = 'yt-dlp:recheck-binaries',
// 	Ytdlp_UpdateBinary      = 'yt-dlp:update-binary',
// 	Ytdlp_UpdatingBinary    = 'yt-dlp:updating-binary',
// 	Ytdlp_UpdatedBinary     = 'yt-dlp:updated-binary',
// 	// Autostart channels
// 	Autostart_Enable    = 'autostart:enable',
// 	Autostart_Disable   = 'autostart:disable',
// 	Autostart_Toggle    = 'autostart:toggle',
// 	// Global menu channels
// 	GlobalMenu_Enable  = 'global-menu:enable',
// 	GlobalMenu_Disable = 'global-menu:disable',
// 	GlobalMenu_Toggle  = 'global-menu:toggle',
// 	// Updater channels
// 	Updater_Outdated             = 'updater:outdated',
// 	Updater_ShowWindow           = 'updater:show-window',
// 	Updater_GetLatestRelease     = 'updater:get-latest-release',
// 	Updater_GetLatestChangelog   = 'updater:get-latest-changelog',
// 	Updater_GetCommitsSinceBuild = 'updater:get-commits-since-build',
// 	Updater_CheckForUpdates      = 'updater:check-for-updates',
// 	Updater_CheckingForUpdates   = 'updater:checking-for-updates',
// 	Updater_Update               = 'updater:update',
// 	Updater_Step                 = 'updater:update-step',
// 	Updater_Cancel               = 'updater:cancel-update',
// 	Updater_Complete             = 'updater:update-complete',
// 	// Feature Flag channels
// 	FeatureFlag_GetFeatureFlags = 'feature-flag:get-feature-flags',
// }

import type { Nullable } from './types';
import type { SettingsKey } from './settings';
import type { Endpoints } from '@octokit/types';
import type { FeatureFlag } from './featureFlags';

export interface IIpcContract {
	'show-message-box': {
		args: [options: Electron.MessageBoxOptions];
		return: Electron.MessageBoxReturnValue;
	}
	'show-text-selection-menu': {
		args: [type: 'input' | 'input-selection' | 'text-selection'];
		return: void;
	}
	//
	'window<-minimize': {
		args: [windowName: string];
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
		args: [key: SettingsKey, value: any, secure?: boolean];
		return: void;
	}
	'settings<-get': {
		args: [key: SettingsKey, defaultValue?: any, secure?: boolean];
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
	'settings->changed': { key: SettingsKey; value: any };
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
