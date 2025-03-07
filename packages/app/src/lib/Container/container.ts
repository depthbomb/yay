import type { Services } from './types';

export class Container {
	public constructor(
		private readonly modules: Services = {} as Services
	) {}

	public register<Name extends keyof Services>(name: Name, instance: Services[Name]): void {
		const key = this.nameToKey(name);
		if (Object.keys(this.modules).includes(key)) {
			throw new Error(`Module "${key}" is already registered`);
		}

		this.modules[name] = instance;
	}

	public get<Name extends keyof Services>(name: Name): Services[Name] {
		const key = this.nameToKey(name);
		if (!Object.keys(this.modules).includes(key)) {
			throw new Error(`Module with name "${key}" could not be found`);
		}

		return this.modules[name];
	}

	private nameToKey<Name extends keyof Services>(name: Name): string {
		return String(name);
	}
}
