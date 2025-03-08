import { typeFlag } from 'type-flag';
import type { ModuleRegistry } from '~/lib/ModuleRegistry';

export class CliModule {
	public static bootstrap(moduleRegistry: ModuleRegistry) {
		const args = typeFlag({
			dev: {
				type: Boolean,
				alias: 'd',
				default: false
			},
			uninstall: {
				type: Boolean,
				default: false
			},
			updateBinaries: {
				type: Boolean,
				default: false,
			}
		}, process.argv);

		moduleRegistry.register('Args', args);
		moduleRegistry.register('Flags', args.flags);
	}
}
