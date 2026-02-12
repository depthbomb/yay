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

export class AppEventEmitter extends EventEmitter<AppEvents> {
	public async emitAsync<K extends keyof AppEvents>(eventName: K, ...args: AppEvents[K]) {
		const listeners = this.rawListeners(eventName) as Array<(...params: AppEvents[K]) => Awaitable<unknown>>;

		return Promise.allSettled(
			listeners.map(listener => Promise.resolve().then(() => listener.apply(this, args)))
		);
	}
}


export const eventBus = new AppEventEmitter();
