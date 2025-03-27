import type { Modules } from './types';

export class ModuleRegistry {
	public constructor(
		private readonly modules = new Map<keyof Modules, Modules[keyof Modules]>()
	) {}

	public register<Name extends keyof Modules>(name: Name, instance: Modules[Name]): void {
		if (this.modules.has(name)) {
			throw new Error(`Module "${name}" is already registered`);
		}

		this.modules.set(name, instance);
	}

	public get<Name extends keyof Modules>(name: Name): Modules[Name] {
		if (!this.modules.has(name)) {
			throw new Error(`Module "${name}" could not be found`);
		}

		return this.modules.get(name) as Modules[Name];
	}
}
