import { typeFlag } from 'type-flag';
import { injectable } from '@needle-di/core';

@injectable()
export class CLIService {
	public readonly args;
	public readonly flags;

	public constructor() {
		this.args = typeFlag({
			autostart: {
				type: Boolean,
				default: false
			},
			fromShortcut: {
				type: Boolean,
				default: false
			},
			uninstall: {
				type: Boolean,
				default: false
			},
			updateBinaries: {
				type: Boolean,
				default: false
			}
		}, process.argv);
		this.flags = this.args.flags;
	}
}
