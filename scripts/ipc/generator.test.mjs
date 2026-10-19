import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { generateCpp } from './cpp.mjs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { protocol } from '../../protocol/ipc.ts';
import { execFileSync } from 'node:child_process';
import { validateSettings } from './settings.mjs';
import { generateTypescript } from './typescript.mjs';
import { settings } from '../../protocol/settings.ts';
import { contractName } from '../../protocol/names.ts';
import { wireSchema, createWireNames } from './wire_names.mjs';

test('each build gets unique random IDs shared by both generated languages and the validator', () => {
	const names = createWireNames(protocol);
	const next = createWireNames(protocol);
	assert.equal(new Set(names.values()).size, names.size);
	const ts = generateTypescript(protocol, '', names, settings);
	const cpp = generateCpp(protocol, '', names, settings);
	for (const [channel, wire] of names) {
		assert.match(wire, /^[a-f0-9]{32}$/);
		assert.notEqual(next.get(channel), wire);
		assert.ok(cpp.implementation.includes(`return "${wire}";`));
		assert.ok(!cpp.implementation.includes(JSON.stringify(channel)));
		if (!Object.hasOwn(protocol.internalEvents, channel)) {
			assert.ok((ts.contract + ts.debugContract).includes(`${contractName(channel)} = "${wire}"`));
		}
	}

	const runtime = wireSchema(protocol, names);
	for (const [channel, definition] of Object.entries(protocol.requests)) {
		assert.deepEqual(runtime.requests[names.get(channel)], definition);
	}
	for (const [channel, definition] of Object.entries(protocol.events)) {
		assert.deepEqual(runtime.events[names.get(channel)], definition);
	}
	assert.deepEqual(runtime.definitions, protocol.definitions);
	assert.ok(ts.contract.includes('DownloadDir = "download-dir"'), 'Persisted setting keys are not randomized');
	assert.ok(!ts.contract.includes(names.get('native<-diagnostics')), 'Debug enum values stay in a separate module');
});

test('settings have one source for keys, defaults, limits, and renderer types', () => {
	validateSettings(settings);
	assert.deepEqual(protocol.definitions.SettingsKey.enum, Object.keys(settings));
	const ts = generateTypescript(protocol, '', new Map(), settings);
	assert.ok(ts.contract.includes('[SettingsKey.EnableGlobalMenu]: boolean;'));
	assert.ok(ts.contract.includes('[SettingsKey.DefaultDownloadAction]: "video" | "audio";'));
	assert.ok(ts.contract.includes('[SettingsKey.CookiesFilePath]: string | null;'));
	const cpp = generateCpp(protocol, '', new Map(), settings);
	assert.ok(cpp.header.includes('enum class SettingsKey'));
	assert.ok(cpp.header.includes('SettingsKey key{};'), 'Native request and event keys use the generated enum');
	assert.ok(cpp.implementation.includes('args.at(0).get<SettingsKey>()'));
	for (const key of Object.keys(settings)) {
		assert.ok(cpp.header.includes(`SettingsKey::${contractName(key)}`));
		assert.ok(cpp.implementation.includes(`case SettingsKey::${contractName(key)}:\n        return ${JSON.stringify(key)};`));
	}
	assert.throws(() => validateSettings({ flag: { schema: { type: 'boolean' }, default: 'true' } }), /default does not satisfy/);
	assert.throws(() => validateSettings({ port: { schema: { type: 'integer', minimum: 1, maximum: 65535 }, default: 65536 } }), /default does not satisfy/);
	assert.throws(() => validateSettings({ path: { ...settings['download-dir'], default: 'C:\\downloads' } }), /not both/);
	assert.throws(() => validateSettings({ path: { schema: { type: 'string' } } }), /needs a default/);
	assert.throws(() => validateSettings({ path: { schema: { type: 'string', maxBytes: 1 }, default: 'é' } }), /default does not satisfy/);
});

test('build generation rotates IDs in its own directory without rewriting source contracts', () => {
	const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
	const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'yay-ipc-generation-'));
	const source = path.join(root, 'ui/src/ipc/ipc.generated.ts');
	const before = fs.readFileSync(source, 'utf8');
	const nativeHeader = path.join(root, 'src/generated/ipc_contract.h');
	const beforeHeader = fs.readFileSync(nativeHeader, 'utf8');
	const generate = directory => execFileSync('bun', [path.join(root, 'scripts/generate_ipc.mjs'), '--build-root', directory]);
	generate(path.join(temp, 'debug'));
	const first = fs.readFileSync(path.join(temp, 'debug/wire-channels.json'), 'utf8');
	generate(path.join(temp, 'release'));
	assert.equal(fs.readFileSync(path.join(temp, 'debug/wire-channels.json'), 'utf8'), first);
	assert.notEqual(fs.readFileSync(path.join(temp, 'release/wire-channels.json'), 'utf8'), first);
	generate(path.join(temp, 'debug'));
	assert.notEqual(fs.readFileSync(path.join(temp, 'debug/wire-channels.json'), 'utf8'), first);
	assert.equal(fs.readFileSync(source, 'utf8'), before);
	assert.equal(fs.readFileSync(nativeHeader, 'utf8'), beforeHeader);
	assert.ok(!fs.existsSync(path.join(temp, 'debug/src/generated/ipc_contract.h')), 'C++ declarations have one canonical header');
	assert.ok(fs.existsSync(path.join(temp, 'debug/src/generated/ipc_contract.cc')));
});
