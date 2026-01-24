import { promises as fs } from 'node:fs';
import { randomBytes } from 'node:crypto';

export interface IBaseRecord {
	id: string;
}

export type QueryOperator = '$eq' | '$ne' | '$gt' | '$gte' | '$lt' | '$lte' | '$in' | '$nin' | '$contains';

export type FieldCondition<T> = {
	[K in keyof T]?: T[K] | { [op in QueryOperator]?: any };
};

export type QueryCondition<T> = FieldCondition<T> & {
	$and?: QueryCondition<T>[];
	$or?: QueryCondition<T>[];
	$not?: QueryCondition<T>;
};

export interface IDatabaseOptions {
	path: string;
	pretty?: boolean;
	autoSave?: boolean;
	idGenerator?: () => string;
}

export class JSONDatabase<T extends IBaseRecord> {
	private data = new Map<string, T>();
	private path: string;
	private pretty: boolean;
	private autoSave: boolean;
	private saveTimeout?: NodeJS.Timeout;
	private idGenerator: () => string;

	public constructor(options: IDatabaseOptions) {
		this.path        = options.path;
		this.pretty      = options.pretty ?? false;
		this.autoSave    = options.autoSave ?? true;
		this.idGenerator = options.idGenerator ?? (() => this.createUUIDv7());
	}

	public async init() {
		try {
			const fileContent = await fs.readFile(this.path, 'utf-8');
			const records     = JSON.parse(fileContent) as T[];

			this.data = new Map(records.map(record => [record.id, record]));
		} catch (error: any) {
			if (error.code === 'ENOENT' || error instanceof SyntaxError) {
				await this.save();
			} else {
				throw error;
			}
		}
	}

	public async save() {
		const records = Array.from(this.data.values());
		const json = this.pretty
			? JSON.stringify(records, null, 4)
			: JSON.stringify(records);

		await fs.writeFile(this.path, json, 'utf-8');
	}

	public async insert(record: Omit<T, 'id'> | T) {
		const newRecord = 'id' in record && record.id
			? record
			: ({ id: this.idGenerator(), ...record } as T);

		if (this.data.has(newRecord.id)) {
			throw new Error(`Record with id "${newRecord.id}" already exists`);
		}

		this.data.set(newRecord.id, { ...newRecord });
		this.scheduleSave();

		return newRecord;
	}

	public async insertMany(records: (Omit<T, 'id'> | T)[]) {
		const newRecords = records.map(record =>'id' in record && record.id ? record : ({ ...record, id: this.idGenerator() } as T));
		for (const record of newRecords) {
			if (this.data.has(record.id)) {
				throw new Error(`Record with id "${record.id}" already exists`);
			}
		}

		for (const record of newRecords) {
			this.data.set(record.id, { ...record });
		}

		this.scheduleSave();

		return newRecords;
	}

	public async findById(id: string) {
		return this.data.get(id) ?? null;
	}

	public async findOne(query: QueryCondition<T>) {
		for (const record of this.data.values()) {
			if (this.matchesQuery(record, query)) {
				return record;
			}
		}

		return null;
	}

	public async find(query?: QueryCondition<T>) {
		if (!query) {
			return Array.from(this.data.values());
		}

		return Array.from(this.data.values()).filter(record => this.matchesQuery(record, query));
	}

	public async getAll() {
		return Array.from(this.data.values());
	}

	public async updateById(id: string, updates: Partial<Omit<T, 'id'>>) {
		const existing = this.data.get(id);
		if (!existing) {
			return null;
		}

		const updated = { ...existing, ...updates, id };

		this.data.set(id, updated);
		this.scheduleSave();

		return updated;
	}

	public async updateMany(query: QueryCondition<T>, updates: Partial<Omit<T, 'id'>>) {
		let count = 0;

		for (const [id, record] of this.data.entries()) {
			if (this.matchesQuery(record, query)) {
				const updated = { ...record, ...updates, id };
				this.data.set(id, updated);
				count++;
			}
		}

		if (count > 0) {
			this.scheduleSave();
		}

		return count;
	}


	public async deleteById(id: string) {
		const deleted = this.data.delete(id);
		if (deleted) {
			this.scheduleSave();
		}

		return deleted;
	}

	public async deleteMany(query: QueryCondition<T>) {
		let count = 0;
		const idsToDelete: string[] = [];

		for (const [id, record] of this.data.entries()) {
			if (this.matchesQuery(record, query)) {
				idsToDelete.push(id);
			}
		}

		for (const id of idsToDelete) {
			this.data.delete(id);
			count++;
		}

		if (count > 0) {
			this.scheduleSave();
		}

		return count;
	}

	public async count(query?: QueryCondition<T>) {
		if (!query) {
			return this.data.size;
		}

		let count = 0;
		for (const record of this.data.values()) {
			if (this.matchesQuery(record, query)) {
				count++;
			}
		}

		return count;
	}

	public async exists(id: string) {
		return this.data.has(id);
	}

	public async clear() {
		this.data.clear();
		await this.save();
	}

	private scheduleSave() {
		if (!this.autoSave) {
			return;
		}

		if (this.saveTimeout) {
			clearTimeout(this.saveTimeout);
		}

		this.saveTimeout = setTimeout(() => {
			this.save().catch(err => console.error('Auto-save failed:', err));
		}, 100);
	}

	private matchesQuery(record: T, query: QueryCondition<T>): boolean {
		if ('$and' in query && query.$and) {
			return query.$and.every(subQuery => this.matchesQuery(record, subQuery));
		}

		if ('$or' in query && query.$or) {
			return query.$or.some(subQuery => this.matchesQuery(record, subQuery));
		}

		if ('$not' in query && query.$not) {
			return !this.matchesQuery(record, query.$not);
		}

		for (const [key, condition] of Object.entries(query)) {
			if (key === '$and' || key === '$or' || key === '$not') {
				continue;
			}

			const recordValue = (record as any)[key];

			if (typeof condition === 'object' && condition !== null && !Array.isArray(condition)) {
				for (const [op, value] of Object.entries(condition)) {
					switch (op as QueryOperator) {
						case '$eq':
							if (recordValue !== value) return false;
							break;
						case '$ne':
							if (recordValue === value) return false;
							break;
						case '$gt':
							if (recordValue <= value) return false;
							break;
						case '$gte':
							if (recordValue < value) return false;
							break;
						case '$lt':
							if (recordValue >= value) return false;
							break;
						case '$lte':
							if (recordValue > value) return false;
							break;
						case '$in':
							if (!Array.isArray(value) || !value.includes(recordValue)) return false;
							break;
						case '$nin':
							if (!Array.isArray(value) || value.includes(recordValue)) return false;
							break;
						case '$contains':
							if (typeof recordValue === 'string' && !recordValue.includes(value)) return false;
							if (Array.isArray(recordValue) && !recordValue.includes(value)) return false;
							break;
					}
				}
			} else {
				if (recordValue !== condition) return false;
			}
		}

		return true;
	}

	private createUUIDv7() {
		const now      = BigInt(Date.now());
		const timeHigh = Number((now >> 16n) & 0xffffn);
		const timeMid  = Number(now & 0xffffn);
		const rand     = randomBytes(10);

		rand[0] = (rand[0] & 0x0f) | 0x70;
		rand[2] = (rand[2] & 0x3f) | 0x80;

		return (
			timeHigh.toString(16).padStart(4, '0') +
			timeMid.toString(16).padStart(4, '0') +
			'-' +
			rand.subarray(0, 2).toString('hex') +
			'-' +
			rand.subarray(2, 4).toString('hex') +
			'-' +
			rand.subarray(4, 6).toString('hex') +
			'-' +
			rand.subarray(6, 10).toString('hex')
		);
	}
}
