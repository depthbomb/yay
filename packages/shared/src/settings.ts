export enum SettingsKey {
	DownloadDir            = 'download-dir',
	DefaultDownloadAction  = 'default-download-action',
	BeepOnDownloadComplete = 'beep-on-download-complete',
	NotificationSoundId    = 'notification-sound-id',
	EnableGlobalMenu       = 'enable-global-menu',
	YtdlpPath              = 'yt-dlp-path',
	ShowWindowFrame        = 'show-window-frame',
}

export const SettingsKeys = Object.values(SettingsKey);
