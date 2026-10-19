import { test } from 'node:test';
import assert from 'node:assert/strict';
import { connectNativeClient } from './native-client';
import type { IpcTransport } from './ipc-client';
import type { BootstrapState } from './ipc.generated';

function fixture() {
	const sent: unknown[] = [];
	let receive: (event: MessageEvent) => void;
	const transport: IpcTransport = {
		postMessage(message) {
			sent.push(message);
		},
		addEventListener(_type, listener) {
			receive = listener;
		},
	};
	return {
		transport,
		sent,
		reply(id: number, data: unknown) {
			receive({ data: { id, result: { isOk: true, isErr: false, data } } } as MessageEvent);
		},
		fail(id: number) {
			receive({ data: { id, result: { isOk: false, isErr: true, error: 'Unavailable' } } } as MessageEvent);
		},
	};
}

function bootstrap(release = '10.0.22000'): BootstrapState {
	return {
		system: { arch: 'x64', type: 'Windows_NT', release, platform: 'win32', hostname: 'test-host' },
		versions: { webview2: 'test-webview', chrome: 'test-chrome', native: 'C++23 / MSVC' },
		buildDate: '2026-10-18T00:00:00Z',
		flags: [{ uuid: 'flag', description: 'Test flag', enabled: true }],
		diagnostics: true,
		development: true,
	};
}

test('native connection waits for bootstrap and exposes the same system, build, and feature data', async () => {
	const { transport, sent, reply } = fixture();
	let connected = false;
	const pending = connectNativeClient(transport, true).then(client => {
		connected = true;
		return client;
	});
	await Promise.resolve();
	assert.equal(connected, false);
	assert.deepEqual(sent, [{ id: 1, channel: 'native<-bootstrap', args: [] }]);
	const state = bootstrap();
	reply(1, state);
	const client = await pending;
	assert.deepEqual(client.system, state.system);
	assert.deepEqual(client.versions, state.versions);
	assert.equal(client.buildDate.toISOString(), state.buildDate.replace('Z', '.000Z'));
	assert.equal(client.featureFlags, state.flags);
	assert.equal(client.development, true);
	assert.equal(client.diagnostics, true);
	assert.equal(client.isWindows11, true);
	assert.ok(Object.isFrozen(client.system));
	assert.ok(Object.isFrozen(client.versions));
});

test('release connections ignore diagnostic flags and retain the Windows 11 build cutoff', async () => {
	const { transport, reply } = fixture();
	const pending = connectNativeClient(transport, false);
	reply(1, bootstrap('10.0.21999'));
	const client = await pending;
	assert.equal(client.development, false);
	assert.equal(client.diagnostics, false);
	assert.equal(client.isWindows11, false);
});

test('failed bootstrap rejects before making a native client available', async () => {
	const { transport, fail } = fixture();
	const pending = connectNativeClient(transport, true);
	fail(1);
	await assert.rejects(pending, /Unable to initialize the native application bridge/);
});

test('clipboard writes report failures while preserving their wire messages', async () => {
	const { transport, sent, reply, fail } = fixture();
	const pending = connectNativeClient(transport, true);
	reply(1, bootstrap());
	const { clipboard } = await pending;
	const read = clipboard.readText();
	reply(2, 'clipboard text');
	assert.equal(await read, 'clipboard text');
	const write = clipboard.writeText('new text');
	reply(3, {});
	assert.equal(await write, undefined);
	const failedRead = clipboard.readText();
	fail(4);
	assert.equal(await failedRead, undefined);
	const failedWrite = clipboard.writeText('unavailable');
	fail(5);
	await assert.rejects(failedWrite, /Unavailable/);
	assert.deepEqual(sent.slice(1), [
		{ id: 2, channel: 'native<-clipboard-read', args: [] },
		{ id: 3, channel: 'native<-clipboard-write', args: ['new text'] },
		{ id: 4, channel: 'native<-clipboard-read', args: [] },
		{ id: 5, channel: 'native<-clipboard-write', args: ['unavailable'] },
	]);
});
