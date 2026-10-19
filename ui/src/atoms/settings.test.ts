import { test } from 'node:test';
import { createStore } from 'jotai';
import assert from 'node:assert/strict';
import { SettingsKey } from '../ipc/ipc.generated';
import { settingAtom, settingsAtom } from './settings';

test('settings hydrate, replace, and update individual fields without waking unrelated subscribers', () => {
	const store = createStore();
	const action = settingAtom(SettingsKey.DefaultDownloadAction);
	const folder = settingAtom(SettingsKey.DownloadDir);
	let actionChanges = 0;
	let folderChanges = 0;
	const removeAction = store.sub(action, () => ++actionChanges);
	const removeFolder = store.sub(folder, () => ++folderChanges);

	assert.equal(store.get(action), undefined);
	store.set(settingsAtom, {
		[SettingsKey.DefaultDownloadAction]: 'video',
		[SettingsKey.DownloadDir]: 'C:\\downloads',
	});
	assert.equal(store.get(action), 'video');
	assert.equal(store.get(folder), 'C:\\downloads');
	assert.deepEqual([actionChanges, folderChanges], [1, 1]);

	store.set(action, 'audio');
	assert.equal(store.get(settingsAtom)[SettingsKey.DefaultDownloadAction], 'audio');
	assert.equal(store.get(folder), 'C:\\downloads');
	assert.deepEqual([actionChanges, folderChanges], [2, 1]);
	store.set(action, 'audio');
	assert.deepEqual([actionChanges, folderChanges], [2, 1]);

	store.set(settingsAtom, { [SettingsKey.DownloadDir]: 'D:\\downloads' });
	assert.equal(store.get(action), undefined);
	assert.equal(store.get(folder), 'D:\\downloads');
	assert.deepEqual([actionChanges, folderChanges], [3, 2]);
	removeAction();
	removeFolder();
});

test('shared atom definitions keep state scoped to their store', () => {
	const first = createStore();
	const second = createStore();
	const key = SettingsKey.EnableGlobalMenu;
	assert.equal(settingAtom(key), settingAtom(key));
	first.set(settingAtom(key), true);
	assert.equal(first.get(settingAtom(key)), true);
	assert.equal(second.get(settingAtom(key)), undefined);
});
