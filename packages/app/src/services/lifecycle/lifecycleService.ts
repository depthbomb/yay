import mitt from 'mitt';
import { app } from 'electron';
import { timeout } from '~/common/async';
import { injectable } from '@needle-di/core';
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
	}

	public get shutdownRequested() {
		return this._shutdownRequested;
	}

	public async bootstrap() {
		app.once('before-quit', () => {
			if (this.shutdownRequested) {
				return;
			}

			this._shutdownRequested = true;

			this.events.emit('shutdown');
		});

		app.once('will-quit', e => {
			e.preventDefault();

			// Allow some time for services to perform their shutdown routine
			timeout(1_500).finally(app.quit);
		});
	}
}
