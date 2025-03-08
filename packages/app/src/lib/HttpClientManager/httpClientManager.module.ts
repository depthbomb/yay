import { HttpClientManager } from '.';
import type { ModuleRegistry } from '~/lib/ModuleRegistry';

export class HttpClientManagerModule {
	public static bootstrap(moduleRegistry: ModuleRegistry) {
		moduleRegistry.register('HttpClientManager', new HttpClientManager());
	}
}
