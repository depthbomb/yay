import type { Emitter } from 'mitt';
import type { Events } from '~/lib/EventEmitter';

export class EventSubscriber {
	public constructor(
		private readonly emitter: Emitter<Events>
	) {}

	public subscribe<Event extends keyof Events>(event: Event, handler: (data: Events[Event]) => unknown) {
		this.emitter.on(event, handler);
	}
}
