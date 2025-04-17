import { Store } from './store';
import { StoreReader } from './storeReader';
import { StoreWriter } from './storeWriter';
import { injectable } from '@needle-di/core';

@injectable()
export class StoreService {
	public createStore<S extends Record<string, any>>(path: string) {
		return new Store<S>(
			new StoreReader(),
			new StoreWriter(),
			path
		);
	}
}
