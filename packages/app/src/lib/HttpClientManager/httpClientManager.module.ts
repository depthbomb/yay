import { HttpClientManager } from '.';
import type { Container } from '~/lib/Container';

export class HttpClientManagerModule {
	public static bootstrap(container: Container) {
		container.register('HttpClientManager', new HttpClientManager());
	}
}
