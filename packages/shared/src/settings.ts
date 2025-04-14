export enum SettingsKey {
	EnableNewReleaseToast         = 'enable-new-release-toast',
	EnableGlobalMenu              = 'enable-global-menu',
	ShowHintFooter                = 'show-hint-footer',
	ShowWindowFrame               = 'show-window-frame',
	HideSetupWindow               = 'hide-setup-window',
	DownloadDir                   = 'download-dir',
	DownloadNameTemplate          = 'download-name-template',
	DefaultDownloadAction         = 'default-download-action',
	EnableDownloadCompletionToast = 'enable-download-completion-toast',
	YtdlpPath                     = 'yt-dlp-path',
	SkipYoutubePlaylists          = 'skip-youtube-playlists',
}

export const SettingsKeys = Object.values(SettingsKey);
