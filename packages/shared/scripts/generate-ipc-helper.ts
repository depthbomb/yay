import { Project } from 'ts-morph';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

function toEnumKey(channel: string, isEvent = false): string {
	const parts = channel
		.replace(/<-|->/g, '_') // arrows → underscores
		.split(/[^a-zA-Z0-9]+/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1));

	let base = parts.join('_');

	if (isEvent) {
		base = `${base}_Event`; // add suffix only for events
	}

	return base;
}

function generateFromInterface(
	sourcePath: string,
	interfaceName: string,
	typeName: string,
	arrayName: string,
	enumName: string,
	outputPath: string,
	isEvent = false
) {
	const project = new Project({ tsConfigFilePath: resolve('./tsconfig.json') });
	const source  = project.getSourceFileOrThrow(sourcePath);
	const iface   = source.getInterfaceOrThrow(interfaceName);
	const keys    = iface.getProperties().map((p) => p.getName());

	const typeLines = [
		`// This file is auto-generated, do not edit it directly.`,
		`import type { ${interfaceName} } from './ipc';`,
		``,
		`export type ${typeName} = keyof ${interfaceName};`,
		`export const ${arrayName} = ${JSON.stringify(keys.map(k => k.replace(/'/g, ''))).replace(/"/g, '\'')} as ${typeName}[];`,
		``,
		`export const enum ${enumName} {`,
		...keys.map((k) => `\t${toEnumKey(k, isEvent)} = ${k},`),
		`}`,
	];

	writeFileSync(outputPath, typeLines.join('\n'), 'utf-8');
	console.log(`✅ Generated ${outputPath}`);
}

generateFromInterface(
	'./src/ipc.ts',
	'IIPCContract',
	'IPCChannel',
	'IPCChannels',
	'EIPCChannel',
	'./src/ipc-channels.generated.ts',
	false
);

generateFromInterface(
	'./src/ipc.ts',
	'IIPCEvents',
	'IPCEvent',
	'IPCEvents',
	'EIPCEvent',
	'./src/ipc-events.generated.ts',
	true
);
