import { typeFlag } from 'type-flag';
import type { Container } from '~/lib/Container';

export class CliModule {
	public static bootstrap(container: Container) {
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

		container.register('Args', args);
		container.register('Flags', args.flags);
	}
}
