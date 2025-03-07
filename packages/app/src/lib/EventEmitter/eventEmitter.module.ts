import mitt from 'mitt';
import { EventEmitter } from './eventEmitter';
import type { Events } from './types';
import type { Container } from '~/lib/Container';

export class EventEmitterModule {
	public static bootstrap(container: Container) {
		const emitter = mitt<Events>();

		container.register('Emitter', emitter);
		container.register('EventEmitter', new EventEmitter(emitter));
	}
}
