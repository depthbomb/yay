export enum IpcChannel {
	ShowMessageBox = 'show-message-box',
	//
	Window_Minimize  = 'window:minimize',
	Window_IsBlurred = 'window:is-blurred',
	Window_IsFocused = 'window:is-focused',
	// Setup channels
	Setup_Step   = 'setup:step',
	Setup_Cancel = 'setup:cancel',
	// Main Window channels
	Main_ShowUrlMenu        = 'main:show-url-menu',
	Main_PickDownloadDir    = 'main:pick-download-dir',
	Main_OpenDownloadDir    = 'main:open-download-dir',
	Main_PickCookiesFile    = 'main:pick-cookies-file',
	Main_ToggleWindowPinned = 'main:toggle-window-pinned',
	// Settings channels
	Settings_Changed = 'settings:changed',
	Settings_Set     = 'settings:get',
	Settings_Get     = 'settings:set',
	Settings_Reset   = 'settings:reset',
	Settings_ShowUi  = 'settings:show-ui',
	// yt-dlp channels
	Ytdlp_DownloadVideo     = 'yt-dlp:download-video',
	Ytdlp_DownloadAudio     = 'yt-dlp:download-audio',
	Ytdlp_DownloadDefault   = 'yt-dlp:download-default',
	Ytdlp_RemoveCookiesFile = 'yt-dlp:remove-cookies-file',
	Ytdlp_DownloadStarted   = 'yt-dlp:download-started',
	Ytdlp_CancelDownload    = 'yt-dlp:cancel-download',
	Ytdlp_DownloadCanceled  = 'yt-dlp:download-canceled',
	Ytdlp_DownloadFinished  = 'yt-dlp:download-finished',
	Ytdlp_Stdout            = 'yt-dlp:stdout',
	Ytdlp_RecheckBinaries   = 'yt-dlp:recheck-binaries',
	Ytdlp_UpdateBinary      = 'yt-dlp:update-binary',
	Ytdlp_UpdatingBinary    = 'yt-dlp:updating-binary',
	Ytdlp_UpdatedBinary     = 'yt-dlp:updated-binary',
	// Autostart channels
	Autostart_Enable    = 'autostart:enable',
	Autostart_Disable   = 'autostart:disable',
	Autostart_Toggle    = 'autostart:toggle',
	// Global menu channels
	GlobalMenu_Enable  = 'global-menu:enable',
	GlobalMenu_Disable = 'global-menu:disable',
	GlobalMenu_Toggle  = 'global-menu:toggle',
	// Updater channels
	Updater_Outdated             = 'updater:outdated',
	Updater_ShowWindow           = 'updater:show-window',
	Updater_GetLatestRelease     = 'updater:get-latest-release',
	Updater_GetLatestChangelog   = 'updater:get-latest-changelog',
	Updater_GetCommitsSinceBuild = 'updater:get-commits-since-build',
	Updater_HasNewRelease        = 'updater:has-new-release',
	Updater_Update               = 'updater:update',
	Updater_Step                 = 'updater:update-step',
	Updater_Cancel               = 'updater:cancel-update',
	Updater_Complete             = 'updater:update-complete',
	// Feature Flag channels
	FeatureFlag_GetFeatureFlags = 'feature-flag:get-feature-flags',
}

export const IpcChannels = Object.values(IpcChannel);
