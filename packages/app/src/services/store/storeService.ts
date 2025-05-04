import { Store } from './store';
import { StoreReader } from './storeReader';
import { StoreWriter } from './storeWriter';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';

@injectable()
export class StoreService {
	public constructor(
		private readonly logger = inject(LoggingService),
	) {}

	public createStore<S extends Record<string, any>>(path: string) {
		return new Store<S>(
			this.logger,
			new StoreReader(),
			new StoreWriter(),
			path
		);
	}
}
