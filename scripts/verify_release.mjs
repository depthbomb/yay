import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import { protocol } from '../protocol/ipc.ts';

const [configuration, executable, webDirectory] = process.argv.slice(2);
if (!configuration || !executable || !webDirectory) {
	throw new Error('Usage: verify_release.mjs <configuration> <executable> <web-directory>');
}

if (configuration.toLowerCase() === 'debug') {
	process.exit(0);
}

const forbiddenMarkers = [
	'--smoke-report',
	'--skip-setup',
	'native<-diagnostics',
	'Example release for the native UI test',
	'Installer execution is disabled during smoke tests.',
	'embedded-test',
	'Accent Color Palette',
	...Object.keys(protocol.requests),
	...Object.keys(protocol.events),
	...Object.keys(protocol.internalEvents),
];

function verifyFile(filename) {
	const content = fs.readFileSync(filename);
	for (const marker of forbiddenMarkers) {
		if (content.includes(Buffer.from(marker)) || content.includes(Buffer.from(marker, 'utf16le'))) {
			throw new Error(`Debug code or an unobfuscated IPC channel found in ${filename}: ${marker}`);
		}
	}
}

verifyFile(executable);
for (const filename of fs.readdirSync(webDirectory, { recursive: true })) {
	const fullPath = path.join(webDirectory, filename);
	if (!fs.statSync(fullPath).isFile()) {
		continue;
	}
	if (/diagnostics|DebugTab|\.(?:test|spec)\./i.test(filename)) {
		throw new Error(`Debug/test asset found in release UI: ${filename}`);
	}
	verifyFile(fullPath);
}

console.log(`${configuration} executable and embedded UI contain no debug/test markers, assets, or descriptive IPC wire names.`);
