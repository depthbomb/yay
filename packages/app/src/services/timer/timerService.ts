import { app } from 'electron';
import { injectable } from '@needle-di/core';
import type { IBootstrappable } from '~/common';

type SetTimeoutReturnType  = ReturnType<typeof setTimeout>;
type SetTimeoutParameters  = Parameters<typeof setTimeout>;
type SetIntervalReturnType = ReturnType<typeof setInterval>;
type SetIntervalParameters = Parameters<typeof setInterval>;

@injectable()
export class TimerService implements IBootstrappable {
	private readonly timeouts  = new Set<SetTimeoutReturnType>();
	private readonly intervals = new Set<SetIntervalReturnType>();

	public async bootstrap() {
		app.once('quit', () => this.clearAll());

		return Promise.resolve();
	}

	public setTimeout(...args: SetTimeoutParameters): SetTimeoutReturnType {
		const id = setTimeout(args[0], args[1]);

		this.timeouts.add(id);

		return id;
	}

	public setInterval(...args: SetIntervalParameters): SetIntervalReturnType {
		const id = setInterval(args[0], args[1]);

		this.intervals.add(id);

		return id;
	}

	public clearTimeout(id: SetTimeoutReturnType) {
		clearTimeout(id);
		this.timeouts.delete(id);
	}

	public clearInterval(id: SetIntervalReturnType) {
		clearInterval(id);
		this.intervals.delete(id);
	}

	public clearAll() {
		for (const id of this.timeouts) {
			clearTimeout(id);
		}

		for (const id of this.intervals) {
			clearInterval(id);
		}

		this.timeouts.clear();
		this.intervals.clear();
	}
}
