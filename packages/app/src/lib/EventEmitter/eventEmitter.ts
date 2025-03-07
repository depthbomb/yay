import type { Emitter } from 'mitt';
import type { Events } from './types';

export class EventEmitter {
	public constructor(
		private readonly emitter: Emitter<Events>
	) {}

	public emit<Event extends keyof Events>(event: Event): void;
	public emit<Event extends keyof Events>(event: Event, data: Events[Event]): void;
	public emit<Event extends keyof Events>(event: Event, data?: Events[Event]): void {
		this.emitter.emit(event, data as Events[Event]);
	}
}
