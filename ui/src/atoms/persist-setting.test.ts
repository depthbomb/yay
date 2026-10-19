import { test } from 'node:test';
import { createStore } from 'jotai';
import assert from 'node:assert/strict';
import { settingAtom } from './settings';
import { persistSetting } from './persist-setting';
import { createIpcClient } from '../ipc/ipc-client';
import { SettingsKey, RequestChannel } from '../ipc/ipc.generated';

function fixture() {
	const store = createStore();
	const sent: Array<{ id: number; channel: string; args: unknown[]; }> = [];
	let receive: (event: MessageEvent) => void;
	const ipc = createIpcClient({
		postMessage(message) { sent.push(message as typeof sent[number]); },
		addEventListener(_type, listener) { receive = listener; },
	});
	const key = SettingsKey.DownloadNameTemplate;
	const atom = settingAtom(key);
	store.set(atom, 'original');
	return {
		store, sent, ipc, key, atom,
		reply(id: number, data: unknown) {
			receive({ data: { id, result: { isOk: true, isErr: false, data } } } as MessageEvent);
		},
		fail(id: number) {
			receive({ data: { id, result: { isOk: false, isErr: true, error: 'Invalid template' } } } as MessageEvent);
		},
	};
}

test('successful setting writes stay optimistic and do not trigger a second read', async () => {
	const f = fixture();
	const save = persistSetting(f.store, f.ipc, f.key, 'updated');
	assert.equal(f.store.get(f.atom), 'updated');
	assert.deepEqual(f.sent, [{ id: 1, channel: RequestChannel.SettingsSet, args: [f.key, 'updated'] }]);
	f.reply(1, {});
	assert.equal(await save, null);
	assert.equal(f.sent.length, 1);
	assert.equal(f.store.get(f.atom), 'updated');
});

test('failed settings restore the stored value and return the backend error', async () => {
	const f = fixture();
	const save = persistSetting(f.store, f.ipc, f.key, '');
	f.fail(1);
	await Promise.resolve();
	assert.deepEqual(f.sent[1], { id: 2, channel: RequestChannel.SettingsGet, args: [f.key] });
	f.reply(2, 'saved');
	assert.equal(await save, 'Invalid template');
	assert.equal(f.store.get(f.atom), 'saved');
});

test('an older failure cannot undo a newer edit from another control', async () => {
	const f = fixture();
	const first = persistSetting(f.store, f.ipc, f.key, '');
	const second = persistSetting(f.store, f.ipc, f.key, 'updated');
	f.fail(1);
	assert.equal(await first, 'Invalid template');
	assert.equal(f.sent.length, 2);
	assert.equal(f.store.get(f.atom), 'updated');
	f.reply(2, {});
	await second;
});

test('a failed-write refresh cannot overwrite an edit made while it was pending', async () => {
	const f = fixture();
	const first = persistSetting(f.store, f.ipc, f.key, '');
	f.fail(1);
	await Promise.resolve();
	const second = persistSetting(f.store, f.ipc, f.key, 'updated');
	f.reply(2, 'original');
	await first;
	assert.equal(f.store.get(f.atom), 'updated');
	f.reply(3, {});
	await second;
});

test('failed bridge reads fall back to the previous value', async () => {
	const f = fixture();
	const save = persistSetting(f.store, f.ipc, f.key, '');
	f.fail(1);
	await Promise.resolve();
	f.fail(2);
	assert.equal(await save, 'Invalid template');
	assert.equal(f.store.get(f.atom), 'original');
});

test('transport exceptions also restore the previous value', async () => {
	const f = fixture();
	const ipc = createIpcClient({
		postMessage() { throw new Error('Bridge unavailable'); },
		addEventListener() { },
	});
	assert.equal(await persistSetting(f.store, ipc, f.key, ''), 'Bridge unavailable');
	assert.equal(f.store.get(f.atom), 'original');
});
