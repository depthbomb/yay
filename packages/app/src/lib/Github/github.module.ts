import { Github } from './github';
import type { ModuleRegistry } from '~/lib/ModuleRegistry';

export class GithubModule {
	public static async bootstrap(moduleRegistry: ModuleRegistry) {
		moduleRegistry.register('Github', new Github());
	}
}
