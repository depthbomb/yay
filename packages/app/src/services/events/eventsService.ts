import mitt from 'mitt';
import { injectable } from '@needle-di/core';
import type { Emitter } from 'mitt';
import type { Events } from './types';

@injectable()
export class EventsService {
	private readonly emitter: Emitter<Events>;

	public constructor() {
		this.emitter = mitt<Events>();
	}

	public emit<Event extends keyof Events>(event: Event): void;
	public emit<Event extends keyof Events>(event: Event, data: Events[Event]): void;
	public emit<Event extends keyof Events>(event: Event, data?: Events[Event]): void {
		this.emitter.emit(event, data as Events[Event]);
	}

	public subscribe<Event extends keyof Events>(event: Event, handler: (data: Events[Event]) => unknown) {
		this.emitter.on(event, handler);
	}
}
