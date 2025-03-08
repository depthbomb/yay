import type { Modules } from './types';

export class ModuleRegistry {
	public constructor(
		private readonly modules: Modules = {} as Modules
	) {}

	public register<Name extends keyof Modules>(name: Name, instance: Modules[Name]): void {
		const key = this.nameToKey(name);
		if (Object.keys(this.modules).includes(key)) {
			throw new Error(`Module "${key}" is already registered`);
		}

		this.modules[name] = instance;
	}

	public get<Name extends keyof Modules>(name: Name): Modules[Name] {
		const key = this.nameToKey(name);
		if (!Object.keys(this.modules).includes(key)) {
			throw new Error(`Module with name "${key}" could not be found`);
		}

		return this.modules[name];
	}

	private nameToKey<Name extends keyof Modules>(name: Name): string {
		return String(name);
	}
}
