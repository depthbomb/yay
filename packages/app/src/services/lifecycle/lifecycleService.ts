import mitt from 'mitt';
import { app } from 'electron';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import type { Awaitable } from 'shared';
import type { IBootstrappable } from '~/common';

type ShutdownVetoRequest = {
	reason: string;
	source: string;
	canProceed: () => Awaitable<boolean>;
};

type LifecycleEvents = {
	shutdownRequested: { veto: (reason: string, source: string, canProceed?: () => Awaitable<boolean>) => void };
	shutdown: void;
	phaseChanged: ELifecyclePhase;
	readyPhase: void;
};

export const enum ELifecyclePhase {
	Starting,
	Ready,
	ShuttingDown,
	Terminated,
}

@injectable()
export class LifecycleService implements IBootstrappable {
	public readonly events = mitt<LifecycleEvents>();

	private _phase                                 = ELifecyclePhase.Starting;
	private _shutdownInProgress                    = false;
	private _shutdownVetoes: ShutdownVetoRequest[] = [];
	private _readyResolve?: () => void;
	private _readyPromise: Promise<void>;

	public constructor(
		private readonly logger = inject(LoggingService),
	) {
		this._readyPromise = new Promise(res => this._readyResolve = res);
	}

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
			this._readyResolve?.();
		}

		this.logger.debug('Lifecycle phase changed', { phase: this._phase });
	}

	public get shutdownInProgress() {
		return this._shutdownInProgress;
	}

	public async whenReady() {
		if (this._phase >= ELifecyclePhase.Ready) {
			return;
		}

		return this._readyPromise;
	}

	public async bootstrap() {
		app.on('window-all-closed', () => {
			this.logger.debug('All windows closed, initiating quit');
			app.quit();
		});

		app.on('before-quit', async (e) => {
			if (this._shutdownInProgress) {
				this.logger.debug('Shutdown already in progress, allowing quit');
				return;
			}

			e.preventDefault();

			this.logger.info('Shutdown requested, beginning graceful shutdown');
			await this.performShutdown();
		});

		app.on('will-quit', () => {
			this.logger.info('App will quit');
			this.phase = ELifecyclePhase.Terminated;
		});
	}

	public async requestShutdown() {
		this.logger.info('Shutdown requested programmatically');
		app.quit();
	}

	public async forceShutdown() {
		this.logger.warn('Force shutdown requested, bypassing vetoes');
		this._shutdownInProgress = true;
		this.phase = ELifecyclePhase.ShuttingDown;
		app.quit();
	}

	public getShutdownVetoes() {
		return this._shutdownVetoes.map(v => ({
			source: v.source,
			reason: v.reason
		}));
	}

	private async performShutdown() {
		if (this._shutdownInProgress) {
			this.logger.warn('Shutdown already in progress, ignoring duplicate request');
			return;
		}

		const canShutdown = await this.checkShutdownVetoes();
		if (!canShutdown) {
			this.logger.info('Shutdown was vetoed, aborting');
			return;
		}

		this._shutdownInProgress = true;
		this.phase = ELifecyclePhase.ShuttingDown;

		try {
			this.logger.info('Emitting shutdown event');
			this.events.emit('shutdown');

			await this.waitForShutdownHandlers();

			this.logger.info('Shutdown complete, exiting');

			app.quit();
		} catch (error) {
			this.logger.error('Error during shutdown', { error });
			app.quit();
		}
	}

	private async checkShutdownVetoes() {
		this._shutdownVetoes = [];

		const vetoFn = (
			reason: string,
			source: string,
			canProceed?: () => Awaitable<boolean>
		) => {
			this._shutdownVetoes.push({ reason, source, canProceed: canProceed || (() => false) });
		};

		this.events.emit('shutdownRequested', { veto: vetoFn });

		if (this._shutdownVetoes.length === 0) {
			return true;
		}

		this.logger.info(`Shutdown vetoed by ${this._shutdownVetoes.length} service(s)`, {
			vetoes: this._shutdownVetoes.map(v => ({ source: v.source, reason: v.reason }))
		});

		const vetoResults = await Promise.all(
			this._shutdownVetoes.map(async (veto) => {
				try {
					const canProceed = await veto.canProceed();
					return { veto, canProceed };
				} catch (error) {
					this.logger.error(`Error checking veto from ${veto.source}`, { error });
					return { veto, canProceed: false };
				}
			})
		);

		const blockingVetoes = vetoResults.filter(r => !r.canProceed);
		if (blockingVetoes.length > 0) {
			this.logger.warn('Shutdown blocked by vetoes', {
				blocking: blockingVetoes.map(r => ({
					source: r.veto.source,
					reason: r.veto.reason
				}))
			});

			return false;
		}

		this.logger.info('All vetoes resolved, proceeding with shutdown');
		return true;
	}

	private async waitForShutdownHandlers(timeoutMs = 5000) {
		return new Promise<void>((res) => {
			const timeout = setTimeout(() => {
				this.logger.warn(`Shutdown handlers exceeded ${timeoutMs}ms timeout`);
				res();
			}, timeoutMs);

			setTimeout(() => {
				clearTimeout(timeout);
				res();
			}, 100);
		});
	}
}
