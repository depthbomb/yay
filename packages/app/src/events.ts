import mitt from 'mitt';
import type { Awaitable, IDownloadSession } from 'shared';
import type { ELifecyclePhase } from '~/services/lifecycle';

type Events = {
	// Lifecycle events
	'lifecycle:shutdown-requested': { veto: (reason: string, source: string, canProceed?: () => Awaitable<boolean>) => void };
	'lifecycle:shutdown':           void;
	'lifecycle:phase-changed':      ELifecyclePhase;
	'lifecycle:ready-phase':        void;
	// yt-dlp events
	'ytdlp:download-queued':   IDownloadSession;
	'ytdlp:download-started':  IDownloadSession;
	'ytdlp:download-progress': IDownloadSession;
	'ytdlp:download-finished': IDownloadSession;
};

export const eventBus = mitt<Events>();
