import EventEmitter from 'node:events';
import type { ELifecyclePhase } from '~/services/lifecycle';
import type { Awaitable, ESettingsKey, IDownloadSession } from 'shared';

type AppEvents = {
	'lifecycle:shutdown-requested': [veto: (reason: string, source: string, canProceed?: () => Awaitable<boolean>) => void];
	'lifecycle:shutdown':           [void];
	'lifecycle:phase-changed':      [ELifecyclePhase];
	'lifecycle:ready-phase':        [void];

	'settings:updated': [key: ESettingsKey, value: unknown];

	'ytdlp:download-queued':   [IDownloadSession];
	'ytdlp:download-started':  [IDownloadSession];
	'ytdlp:download-progress': [IDownloadSession];
	'ytdlp:download-finished': [IDownloadSession];
};

export class AppEventEmitter extends EventEmitter<AppEvents> {}


export const eventBus = new AppEventEmitter();
