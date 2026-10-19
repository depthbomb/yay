import { randomBytes } from 'node:crypto';

export function createWireNames(schema) {
	/**
	 * @type {Map<string, string>}
	 */
	const names = new Map();
	const used = new Set();
	for (const channel of [
		...Object.keys(schema.requests),
		...Object.keys(schema.events),
		...Object.keys(schema.internalEvents ?? {}),
	]) {
		let value;
		do {
			value = randomBytes(16).toString('hex');
		} while (used.has(value));
		used.add(value);
		names.set(channel, value);
	}

	return names;
}

export function wireSchema(schema, names) {
	const remap = entries => Object.fromEntries(Object.entries(entries ?? {}).map(([name, value]) => [names.get(name) ?? name, value]));
	return {
		...schema,
		requests: remap(schema.requests),
		events: remap(schema.events),
		internalEvents: remap(schema.internalEvents),
	};
}
