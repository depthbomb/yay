export enum SettingsKey {
	DownloadDir                   = 'download-dir',
	DownloadNameTemplate          = 'download-name-template',
	DefaultDownloadAction         = 'default-download-action',
	EnableDownloadCompletionToast = 'enable-download-completion-toast',
	EnableGlobalMenu              = 'enable-global-menu',
	YtdlpPath                     = 'yt-dlp-path',
	ShowHintFooter                = 'show-hint-footer',
	ShowWindowFrame               = 'show-window-frame',
	HideSetupWindow               = 'hide-setup-window',
}

export const SettingsKeys = Object.values(SettingsKey);
