import type { StoreReader } from './storeReader';
import type { StoreWriter } from './storeWriter';
import type { LoggingService } from '~/services/logging';

export class Store<S extends Record<string, any>> {
	public store: S;

	public constructor(
		private readonly logger: LoggingService,
		private readonly storeReader: StoreReader,
		private readonly storeWriter: StoreWriter,
		private readonly storePath: string,
	) {
		this.store = this.storeReader.readSync<S>(storePath);
	}

	public get<T>(key: string, defaultValue?: T) {
		if (key in this.store) {
			return this.store[key] as T;
		}

		return defaultValue as T;
	}

	public async set<T>(key: string, value: T) {
		(this.store as Record<string, any>)[key] = value;

		this.logger.trace('Set store value', { key, value });

		await this.save();
	}

	public async reload() {
		this.store = await this.storeReader.read<S>(this.storePath);
	}

	public async reset() {
		this.logger.debug('Resetting store');

		for (const key of Object.keys(this.store)) {
			this.logger.debug('Deleting store object key', { key });
			delete this.store[key as keyof S];
		}

		await this.save();
	}

	public async apply(data: Record<string, any>) {
		for (const [key, value] of Object.entries(data)) {
			this.store[key as keyof S] = value;
		}

		await this.save();
	}

	public async readAll() {
		return this.storeReader.read<S>(this.storePath);
	}

	public readAllSync() {
		return this.storeReader.readSync<S>(this.storePath);
	}

	public async save() {
		this.logger.debug('Saving store object to disk', { store: this.store, storePath: this.storePath });
		await this.storeWriter.write(this.store, this.storePath);
	}
}
