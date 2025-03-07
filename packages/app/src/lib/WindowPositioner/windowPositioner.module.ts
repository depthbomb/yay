import { WindowPositioner } from './windowPositioner';
import type { Container } from '~/lib/Container';

export class WindowPositionerModule {
	public static bootstrap(container: Container) {
		container.register('WindowPositioner', new WindowPositioner());
	}
}
