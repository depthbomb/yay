import { Project } from 'ts-morph';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

function generateFromInterface(sourcePath: string, interfaceName: string, typeName: string, arrayName: string, outputPath: string) {
	const project = new Project({ tsConfigFilePath: resolve('./tsconfig.json') });
	const source  = project.getSourceFileOrThrow(sourcePath);
	const iface   = source.getInterfaceOrThrow(interfaceName);
	const keys    = iface.getProperties().map((p) => p.getName());

	const output = `// This file is auto-generated, do not edit it directly.
import type { ${interfaceName} } from './ipc';

export type ${typeName} = keyof ${interfaceName};
export const ${arrayName} = ${JSON.stringify(keys.map(k => k.replace(/'/g, '')))} as ${typeName}[];
`;

	writeFileSync(outputPath, output, 'utf-8');
	console.log(`✅ Generated ${outputPath}`);
}

generateFromInterface('./src/ipc.ts', 'IIpcContract', 'IpcChannel', 'IpcChannels', './src/ipc-channels.generated.ts');
generateFromInterface('./src/ipc.ts', 'IIpcEvents', 'IpcEvent', 'IpcEvents', './src/ipc-events.generated.ts');
