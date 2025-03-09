export enum SettingsKey {
	DownloadDir            = 'download-dir',
	DefaultDownloadAction  = 'default-download-action',
	NotificationSoundId    = 'notification-sound-id',
	EnableGlobalMenu       = 'enable-global-menu',
	YtdlpPath              = 'yt-dlp-path',
	ShowHintFooter         = 'show-hint-footer',
	ShowWindowFrame        = 'show-window-frame',
}

export const SettingsKeys = Object.values(SettingsKey);
