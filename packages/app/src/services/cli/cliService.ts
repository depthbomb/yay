import { parseArgs } from 'node:util';
import { injectable } from '@needle-di/core';

@injectable()
export class CLIService {
	public readonly args;
	public readonly flags;

	public constructor() {
		const parsedArgs = parseArgs({
			options: {
				autostart: {
					type: 'boolean'
				},
				fromShortcut: {
					type: 'boolean'
				},
				uninstall: {
					type: 'boolean'
				},
				updateBinaries: {
					type: 'boolean'
				},
			}
		});

		this.args  = parsedArgs.positionals;
		this.flags = parsedArgs.values;
	}
}
