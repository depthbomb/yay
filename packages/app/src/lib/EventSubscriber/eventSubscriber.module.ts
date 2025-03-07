import { EventSubscriber } from './eventSubscriber';
import type { Container } from '~/lib/Container';

export class EventSubscriberModule {
	public static bootstrap(container: Container) {
		container.register('EventSubscriber', new EventSubscriber(container.get('Emitter')));
	}
}
