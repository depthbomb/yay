export enum IpcChannel {
	WindowBlurred   = 'WindowBlurred',
	WindowUnblurred = 'WindowUnblurred',
	// Setup channels
	SetupStep   = 'SetupStep',
	CancelSetup = 'CancelSetup',
	// Main Window channels
	ShowInputRightClickMenu = 'ShowInputRightClickMenu',
	OpenDownloadDirPicker   = 'OpenDownloadDirPicker',
	OpenDownloadDir         = 'OpenDownloadDir',
	ToggleWindowPinned      = 'ToggleWindowPinned',
	ShowMessageBox          = 'ShowMessageBox',
	// Settings channels
	SettingsUpdated  = 'SettingsUpdated',
	GetSettingsValue = 'GetSettingsValue',
	SetSettingsValue = 'SetSettingsValue',
	ResetSettings    = 'ResetSettings',
	// yt-dlp channels
	DownloadVideo       = 'DownloadVideo',
	DownloadAudio       = 'DownloadAudio',
	DownloadDefault     = 'DownloadDefault',
	DownloadStarted     = 'DownloadStarted',
	CancelDownload      = 'CancelDownload',
	DownloadCanceled    = 'DownloadCanceled',
	DownloadFinished    = 'DownloadFinished',
	DownloadOutput      = 'DownloadOutput',
	RecheckBinaries     = 'RecheckBinaries',
	CheckForYtdlpUpdate = 'CheckForYtdlpUpdate',
	UpdateYtdlpBinary   = 'UpdateYtdlpBinary',
	UpdatingYtdlpBinary = 'UpdatingYtdlpBinary',
	UpdatedYtdlpBinary  = 'UpdatedYtdlpBinary',
	// Notification channels
	PlayNotificationSound = 'PlayNotificationSound',
	// Autostart channels
	GetAutoStart       = 'GetAutoStart',
	EnableAutoStart    = 'EnableAutoStart',
	DisableAutoStart   = 'DisableAutoStart',
	ToggleAutostart    = 'ToggleAutostart',
	// Global menu channels
	GetGlobalMenuEnabled = 'GetGlobalMenuEnabled',
	EnableGlobalMenu     = 'EnableGlobalMenu',
	DisableGlobalMenu    = 'DisableGlobalMenu',
	ToggleGlobalMenu     = 'ToggleGlobalMenu',
}

export const IpcChannels = Object.values(IpcChannel);
