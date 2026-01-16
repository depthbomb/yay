import { parse, stringify } from 'smol-toml';
import type { LoggingService } from '~/services/logging';
import type { Path } from '@depthbomb/node-common/pathlib';

export class Store<S extends Record<string, any>> {
	public store: S;

	public constructor(
		private readonly logger: LoggingService,
		private readonly storePath: Path,
	) {
		this.store = this.readAllSync();
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
		this.store = await this.readAll();
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
		const data = await this.storePath.readText();
		return parse(data) as S;
	}

	public readAllSync() {
		return parse(
			this.storePath.readTextSync()
		) as S;
	}

	public async save() {
		this.logger.debug('Saving store object to disk', { store: this.store, storePath: this.storePath });

		await this.storePath.writeText(
			stringify(
				this.sortSettingsAlphabetically(this.store)
			)
		);
	}

	private sortSettingsAlphabetically(data: Record<string, any>): Record<string, any> {
		const result = {} as Record<string, any>;
		for (const key of Object.keys(data).sort()) {
			result[key] = data[key];
		}

		return result;
	}
}
