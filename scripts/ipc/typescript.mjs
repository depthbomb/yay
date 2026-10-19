import { generateSettingTypes } from './settings.mjs';
import { contractName } from '../../protocol/names.ts';

function typeOf(value, indent = '', prefix = '') {
	if (value.$ref) {
		return prefix + value.$ref.split('/').at(-1);
	}

	if (value.anyOf) {
		return value.anyOf.map(item => typeOf(item, indent, prefix)).join(' | ');
	}

	if (value.enum) {
		return value.enum.map(item => JSON.stringify(item)).join(' | ');
	}

	if (value.type === 'array') {
		return `Array<${typeOf(value.items, indent, prefix)}>`;
	}

	if (value.type === 'object') {
		if (!value.properties) {
			return 'Record<string, unknown>';
		}

		const fields = Object.entries(value.properties).map(([name, field]) =>
			`${indent}    ${name}${value.required?.includes(name) ? '' : '?'}: ${typeOf(field, indent + '    ', prefix)};`);
		return `{\n${fields.join('\n')}\n${indent}}`;
	}

	return value.type === 'integer' ? 'number' : value.type ?? 'unknown';
}

function enumOf(name, values, wireNames = new Map()) {
	return `export enum ${name} {\n${values.map(value => `    ${contractName(value)} = ${JSON.stringify(wireNames.get(value) ?? value)},`).join('\n')}\n}\n\n`;
}

function requestsOf(requests, channelType, prefix = '') {
	return requests.map(([channel, definition]) => {
		const args = definition.args.map(arg => `${arg.name}${arg.optional ? '?' : ''}: ${typeOf(arg.schema, '', prefix)}`).join(', ');
		return `    [${channelType}.${contractName(channel)}]: {\n        args: [${args}];\n        return: IPCResult<${typeOf(definition.result, '        ', prefix)}, ${definition.error ? 'string' : 'never'}>;\n    };\n`;
	}).join('');
}

export function generateTypescript(schema, banner, wireNames = new Map(), settings = {}) {
	const production = Object.entries(schema.requests).filter(([, request]) => !request.debugOnly);
	const debug = Object.entries(schema.requests).filter(([, request]) => request.debugOnly);
	let contract = banner + "import type { IPCResult } from './ipc-result';\nimport type { DebugIpcContract } from './ipc.debug.generated';\n\n";
	contract += enumOf('RequestChannel', production.map(([channel]) => channel), wireNames);
	contract += enumOf('EventChannel', Object.keys(schema.events), wireNames);
	for (const [name, value] of Object.entries(schema.definitions)) {
		contract += value.enum ? enumOf(name, value.enum) : `export type ${name} = ${typeOf(value)};\n`;
	}

	contract += '\n' + generateSettingTypes(settings, typeOf);

	contract += '\nexport interface IIPCContract extends DebugIpcContract {\n';
	contract += requestsOf(production, 'RequestChannel') + '}\n\nexport interface IIPCEvents {\n';
	for (const [channel, value] of Object.entries(schema.events)) {
		contract += `    [EventChannel.${contractName(channel)}]: ${value.type === 'null' ? 'void' : typeOf(value, '    ')};\n`;
	}

	contract += '}\n\nexport const requestChannels = Object.values(RequestChannel);\nexport const eventChannels = Object.values(EventChannel);\n';
	const debugRequests = requestsOf(debug, 'DebugRequestChannel', 'Model.');
	let debugContract = banner + "import type { IPCResult } from './ipc-result';\n";
	if (debugRequests.includes('Model.')) {
		debugContract += "import type * as Model from './ipc.generated';\n";
	}
	debugContract += '\n';
	debugContract += enumOf('DebugRequestChannel', debug.map(([channel]) => channel), wireNames);
	debugContract += 'export interface DebugIpcContract {\n' + debugRequests + '}\n';
	debugContract += '\nexport const debugRequestChannels = Object.values(DebugRequestChannel);\n';
	return { contract, debugContract };
}
