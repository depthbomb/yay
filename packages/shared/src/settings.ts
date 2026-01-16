export enum ESettingsKey {
	EnableNewReleaseToast         = 'enable-new-release-toast',
	EnableGlobalMenu              = 'enable-global-menu',
	AutoStart                     = 'auto-start',
	HideSetupWindow               = 'hide-setup-window',
	DownloadDir                   = 'download-dir',
	DownloadNameTemplate          = 'download-name-template',
	DefaultDownloadAction         = 'default-download-action',
	CookiesFilePath               = 'cookies-file-path',
	UseThumbnailForCoverArt       = 'use-thumbnail-for-cover-art',
	EnableDownloadCompletionToast = 'enable-download-completion-toast',
	YtdlpPath                     = 'yt-dlp-path',
	DenoPath                      = 'deno-path',
	SkipYoutubePlaylists          = 'skip-youtube-playlists',
	DisableHardwareAcceleration   = 'disable-hardware-acceleration',
	UpdateYtdlpOnStartup          = 'update-ytdlp-on-startup',
	UseNewTwitterVideoDownloader  = 'use-new-twitter-video-downloader',
	EnableLocalApiServer          = 'enable-local-api-server',
	LocalApiServerPort            = 'local-api-server-port',
}

export const SettingsKeys = Object.values(ESettingsKey);
