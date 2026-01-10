import { parse } from 'smol-toml';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

export class StoreReader {
	public constructor() {}

	public async read<T>(path: string): Promise<T> {
		try {
			const data = await readFile(path, 'utf8');
			const json = parse(data);

			return json as T;
		} catch {
			return {} as T;
		}
	}

	public readSync<T>(path: string): T {
		try {
			const data = readFileSync(path, 'utf8');
			const json = parse(data);

			return json as T;
		} catch {
			return {} as T;
		}
	}
}
