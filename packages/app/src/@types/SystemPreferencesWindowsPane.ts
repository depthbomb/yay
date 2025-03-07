export type SystemPreferencesWindowsPane =
	/**
	* System
	*/
	'display'
	| 'sound' // Build 17063+
	| 'notifications'
	| 'quiethours' // Build 17074+
	| 'powersleep'
	| 'batterysaver'
	| 'storagesense'
	| 'tabletmode'
	| 'multitasking'
	| 'project'
	| 'crossdevice'
	| 'clipboard' // Build 17666+
	| 'remotedesktop'
	| 'about'
	/**
	* Devices
	*/
	| 'bluetooth'
	| 'connecteddevices'
	| 'printers'
	| 'mousetouchpad'
	| 'devices-touchpad'
	| 'typing'
	| 'wheel'
	| 'pen'
	| 'autoplay'
	| 'usb'
	| 'mobile-devices' // Build 16251+
	/**
	* Network & Internet
	*/
	| 'network'
	| 'network-status'
	| 'network-cellular'
	| 'network-wifi'
	| 'network-wificalling'
	| 'network-ethernet'
	| 'network-dialup'
	| 'network-vpn'
	| 'network-airplanemode'
	| 'network-mobilehotspot'
	| 'nfctransactions'
	| 'datausage'
	| 'network-proxy'
	/**
	* Personalization
	*/
	| 'personalization'
	| 'personalization-background'
	| 'personalization-colors'
	| 'lockscreen'
	| 'themes'
	| 'fonts' // Build 17083+
	| 'personalization-start'
	| 'taskbar'
	/**
	* Apps
	*/
	| 'appsfeatures'
	| 'optionalfeatures'
	| 'defaultapps'
	| 'maps'
	| 'appsforwebsites'
	| 'videoplayback' // Build 16215+
	| 'startupapps' // Build 17017+
	/**
	* Accounts
	*/
	| 'yourinfo'
	| 'emailandaccounts'
	| 'signinoptions'
	| 'workplace'
	| 'otherusers'
	| 'sync'
	/**
	* Time & language
	*/
	| 'dateandtime'
	| 'regionformatting'
	| 'regionlanguage'
	| 'speech'
	/**
	* Gaming
	*/
	| 'gaming-gamebar'
	| 'gaming-gamedvr'
	| 'gaming-broadcasting'
	| 'gaming-gamemode'
	| 'gaming-xboxnetworking' // Build 16226+
	/**
	* Ease of Access
	*/
	| 'easeofaccess-display' // Build 17025+
	| 'easeofaccess-cursorandpointersize' // Build 17040+
	| 'easeofaccess-cursor'
	| 'easeofaccess-magnifier'
	| 'easeofaccess-colorfilter' // Build 17025+
	| 'easeofaccess-highcontrast'
	| 'easeofaccess-narrator'
	| 'easeofaccess-audio' // Build 17035+
	| 'easeofaccess-closedcaptioning'
	| 'easeofaccess-speechrecognition' // Build 17035+
	| 'easeofaccess-keyboard'
	| 'easeofaccess-mouse'
	| 'easeofaccess-eyecontrol' // Build 17035+
	/**
	* Search & Cortana
	*/
	| 'search-permissions' // Version 1903+
	| 'cortana-windowssearch' // Version 1903+
	| 'cortana' // Build 16188+
	| 'cortana-talktocortana' // Build 16188+
	| 'cortana-permissions' // Build 16188+
	/**
	* Privacy
	*/
	| 'privacy'
	| 'privacy-speech'
	| 'privacy-speechtyping'
	| 'privacy-feedback'
	| 'privacy-activityhistory' // Build 17040+
	| 'privacy-location'
	| 'privacy-webcam'
	| 'privacy-microphone'
	| 'privacy-voiceactivation'
	| 'privacy-notifications'
	| 'privacy-accountinfo'
	| 'privacy-contacts'
	| 'privacy-calendar'
	| 'privacy-phonecalls'
	| 'privacy-callhistory'
	| 'privacy-email'
	| 'privacy-eyetracker'
	| 'privacy-tasks'
	| 'privacy-messaging'
	| 'privacy-radios'
	| 'privacy-customdevices'
	| 'privacy-backgroundapps'
	| 'privacy-appdiagnostics'
	| 'privacy-automaticfiledownloads'
	| 'privacy-documents'
	| 'privacy-pictures'
	| 'privacy-videos'
	| 'privacy-broadfilesystemaccess'
	/**
	* Update & security
	*/
	| 'windowsupdate'
	| 'delivery-optimization'
	| 'windowsdefender'
	| 'backup'
	| 'troubleshoot'
	| 'recovery'
	| 'activation'
	| 'findmydevice'
	| 'developers'
	| 'windowsinsider';
