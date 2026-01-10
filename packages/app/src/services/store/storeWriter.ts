import { stringify } from 'smol-toml';
import { writeFile } from 'node:fs/promises';

export class StoreWriter {
	public constructor() {}

	public async write(data: Record<string, any>, path: string): Promise<void> {
		return writeFile(path, stringify(this.sortSettingsAlphabetically(data)), 'utf8');
	}

	private sortSettingsAlphabetically(data: Record<string, any>): Record<string, any> {
		const result = {} as Record<string, any>;
		for (const key of Object.keys(data).sort()) {
			result[key] = data[key];
		}

		return result;
	}
}
