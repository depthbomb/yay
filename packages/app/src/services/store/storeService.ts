import { Store } from './store';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import type { Path } from '@depthbomb/node-common/pathlib';

@injectable()
export class StoreService {
	public constructor(
		private readonly logger = inject(LoggingService),
	) {}

	public createStore<S extends Record<string, any>>(path: Path) {
		return new Store<S>(this.logger, path);
	}
}
