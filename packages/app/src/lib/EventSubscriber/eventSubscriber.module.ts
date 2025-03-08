import { EventSubscriber } from './eventSubscriber';
import type { ModuleRegistry } from '~/lib/ModuleRegistry';

export class EventSubscriberModule {
	public static bootstrap(moduleRegistry: ModuleRegistry) {
		moduleRegistry.register('EventSubscriber', new EventSubscriber(moduleRegistry.get('Emitter')));
	}
}
