import { parse, stringify } from 'smol-toml';
import { rename, unlink, writeFile } from 'node:fs/promises';
import type { LoggingService } from '~/services/logging';
import type { Path } from '@depthbomb/node-common/pathlib';

export class Store<S extends Record<string, unknown>> {
	public store: S;
	private pendingWrite = Promise.resolve();
	private pendingBatch?: ReturnType<typeof Promise.withResolvers<void>>;
	private saveTimer?: ReturnType<typeof setTimeout>;
	private latestContents = '';
	private writeID = 0;

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
		(this.store as Record<string, unknown>)[key] = value;

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

	public async apply(data: Record<string, unknown>) {
		for (const [key, value] of Object.entries(data)) {
			(this.store as Record<string, unknown>)[key] = value;
		}

		await this.save();
	}

	public async replace(data: S) {
		this.store = data;

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

		this.latestContents = stringify(this.sortSettingsAlphabetically(this.store));
		this.pendingBatch ??= Promise.withResolvers<void>();
		if (this.saveTimer) {
			clearTimeout(this.saveTimer);
		}
		this.saveTimer = setTimeout(() => this.flushPendingBatch(), 50);

		await this.pendingBatch.promise;
	}

	private flushPendingBatch() {
		const batch = this.pendingBatch;
		if (!batch) {
			return;
		}

		const contents    = this.latestContents;
		this.pendingBatch = undefined;
		this.saveTimer    = undefined;

		const write = this.pendingWrite.then(() => this.writeAtomically(contents));
		this.pendingWrite = write.catch(() => {});
		void write.then(batch.resolve, batch.reject);
	}

	private async writeAtomically(contents: string) {
		const storePath = this.storePath.toString();
		const tempPath  = `${storePath}.${process.pid}.${this.writeID++}.tmp`;

		try {
			await writeFile(tempPath, contents, 'utf8');
			await rename(tempPath, storePath);
		} finally {
			await unlink(tempPath).catch(() => {});
		}
	}

	private sortSettingsAlphabetically(data: Record<string, unknown>): Record<string, unknown> {
		const result = {} as Record<string, unknown>;
		for (const key of Object.keys(data).sort()) {
			result[key] = data[key];
		}

		return result;
	}
}
