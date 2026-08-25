import type { ESettingsKey } from '../settings';
import type { IDownloadSession } from '../ytdlp';

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
	// Setup Events
	'setup->step': { message: string; progress: number; };
	'setup->done': void;
	// Settings Events
	'settings->changed':  { key: ESettingsKey; value: any };
	'settings->imported': void;
	// yt-dlp Events
	'yt-dlp->download-queued':   IDownloadSession;
	'yt-dlp->download-started':  IDownloadSession;
	'yt-dlp->download-progress': Pick<IDownloadSession, 'id' | 'progress'>;
	'yt-dlp->download-canceled': IDownloadSession;
	'yt-dlp->download-finished': IDownloadSession;
	'yt-dlp->stdout':            { lines: string[]; };
	'yt-dlp->updating-binary':   void;
	'yt-dlp->updated-binary':    void;
	// Theming Events
	'theming->accent-color-changed': { accentColor: string; };
}
