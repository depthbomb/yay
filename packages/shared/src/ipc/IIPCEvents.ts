import type { ESettingsKey } from '../settings';

export interface IIPCEvents {
	// Main Events
	'main->heartbeat': number; // Only emitted in development mode
	// Window Events
	'window->is-minimized':   void;
	'window->is-maximized':   void;
	'window->is-unmaximized': void;
	'window->is-blurred':     void;
	'window->is-focused':     void;
	'window->is-closed':      { windowName: string; };
	'window->should-reload':  void;
	// Setup Events
	'setup->step': { message: string; progress: number; };
	'setup->done': void;
	// Settings Events
	'settings->changed':  { key: ESettingsKey; value: any };
	'settings->imported': void;
	// yt-dlp Events
	'yt-dlp->download-started':  { url: string; };
	'yt-dlp->download-canceled': void;
	'yt-dlp->download-finished': void;
	'yt-dlp->stdout':            { line: string; };
	'yt-dlp->updating-binary':   void;
	'yt-dlp->updated-binary':    void;
	// Updater Events
	'updater->outdated':             { latestRelease: any; };
	'updater->show-window':          void;
	'updater->checking-for-updates': void;
	'updater->update-step':          { message: string; };
	'updater->update-complete':      void;
	// Theming Events
	'theming->accent-color-changed': { accentColor: string; };
}
