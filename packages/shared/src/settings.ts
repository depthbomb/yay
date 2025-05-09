export enum SettingsKey {
	EnableNewReleaseToast         = 'enable-new-release-toast',
	EnableGlobalMenu              = 'enable-global-menu',
	AutoStart                     = 'auto-start',
	ShowHintFooter                = 'show-hint-footer',
	HideSetupWindow               = 'hide-setup-window',
	DownloadDir                   = 'download-dir',
	DownloadNameTemplate          = 'download-name-template',
	DefaultDownloadAction         = 'default-download-action',
	CookiesFilePath               = 'cookies-file-path',
	UseThumbnailForCoverArt       = 'use-thumbnail-for-cover-art',
	EnableDownloadCompletionToast = 'enable-download-completion-toast',
	YtdlpPath                     = 'yt-dlp-path',
	SkipYoutubePlaylists          = 'skip-youtube-playlists',
	DisableHardwareAcceleration   = 'disable-hardware-acceleration',
}

export const SettingsKeys = Object.values(SettingsKey);
