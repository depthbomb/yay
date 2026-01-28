import mitt from 'mitt';
import type { ELifecyclePhase } from '~/services/lifecycle';
import type { Awaitable, ESettingsKey, IDownloadSession } from 'shared';

type Events = {
	// Lifecycle events
	'lifecycle:shutdown-requested': { veto: (reason: string, source: string, canProceed?: () => Awaitable<boolean>) => void };
	'lifecycle:shutdown':           void;
	'lifecycle:phase-changed':      ELifecyclePhase;
	'lifecycle:ready-phase':        void;
	//
	'settings:updated': { key: ESettingsKey, value: unknown };
	// yt-dlp events
	'ytdlp:download-queued':   IDownloadSession;
	'ytdlp:download-started':  IDownloadSession;
	'ytdlp:download-progress': IDownloadSession;
	'ytdlp:download-finished': IDownloadSession;
};

export const eventBus = mitt<Events>();
