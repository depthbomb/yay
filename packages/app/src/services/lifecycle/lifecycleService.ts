import mitt from 'mitt';
import { app } from 'electron';
import { timeout } from '~/common/async';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import type { IBootstrappable } from '~/common/IBootstrappable';

type LifecycleEvents = {
	shutdown: void;
	phaseChanged: LifecyclePhase;
	readyPhase: void;
};

export const enum LifecyclePhase {
	Starting,
	Ready
}

@injectable()
export class LifecycleService implements IBootstrappable {
	public readonly events = mitt<LifecycleEvents>();

	private _phase             = LifecyclePhase.Starting;
	private _shutdownRequested = false;

	public constructor(
		private readonly logger = inject(LoggingService),
	) {}

	public get phase() {
		return this._phase;
	}

	public set phase(value: LifecyclePhase) {
		if (value < this._phase) {
			throw new Error('Lifecycle phase cannot go backwards');
		}

		if (value === this._phase) {
			return;
		}

		this._phase = value;
		this.events.emit('phaseChanged', this._phase);

		if (this._phase === LifecyclePhase.Ready) {
			this.events.emit('readyPhase');
		}

		this.logger.debug('Lifecycle phase changed', { phase: this._phase });
	}

	public get shutdownRequested() {
		return this._shutdownRequested;
	}

	public async bootstrap() {
		app.once('before-quit', () => {
			if (this.shutdownRequested) {
				return;
			}

			this.logger.info('Shutdown requested, emitting event');

			this._shutdownRequested = true;

			this.events.emit('shutdown');
		});

		app.once('will-quit', e => {
			e.preventDefault();

			this.logger.info('Shutdown initiated, allowing time for service shutdown routines');

			timeout(1_500).finally(() => {
				this.logger.info('Quitting');
				app.quit();
			});
		});
	}
}
