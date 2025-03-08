import { ModuleRegistry } from './moduleRegistry';

export class ModuleRegistryModule {
	public static bootstrap() {
		return new ModuleRegistry();
	}
}
