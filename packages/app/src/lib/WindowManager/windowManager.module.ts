import { WindowManager } from './windowManager';
import type { Container } from '~/lib/Container';

export class WindowManagerModule {
	public static bootstrap(container: Container) {
		container.register('WindowManager', new WindowManager());
	}
}
