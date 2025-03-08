import mitt from 'mitt';
import { EventEmitter } from './eventEmitter';
import type { Events } from './types';
import type { ModuleRegistry } from '~/lib/ModuleRegistry';

export class EventEmitterModule {
	public static bootstrap(moduleRegistry: ModuleRegistry) {
		const emitter = mitt<Events>();

		moduleRegistry.register('Emitter', emitter);
		moduleRegistry.register('EventEmitter', new EventEmitter(emitter));
	}
}
