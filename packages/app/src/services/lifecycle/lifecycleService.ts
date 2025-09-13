import mitt from 'mitt';
import { app } from 'electron';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import type { IBootstrappable } from '~/common';

type LifecycleEvents = {
	shutdown: void;
	phaseChanged: ELifecyclePhase;
	readyPhase: void;
};

export const enum ELifecyclePhase {
	Starting,
	Ready
}

@injectable()
export class LifecycleService implements IBootstrappable {
	public readonly events = mitt<LifecycleEvents>();

	private _phase             = ELifecyclePhase.Starting;
	private _shutdownRequested = false;

	public constructor(
		private readonly logger = inject(LoggingService),
	) {}

	public get phase() {
		return this._phase;
	}

	public set phase(value: ELifecyclePhase) {
		if (value < this._phase) {
			throw new Error('Lifecycle phase cannot go backwards');
		}

		if (value === this._phase) {
			return;
		}

		this._phase = value;
		this.events.emit('phaseChanged', this._phase);

		if (this._phase === ELifecyclePhase.Ready) {
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

			this.logger.info('Quitting');
			this.logger.end();
			app.exit(0);
		});
	}
}
