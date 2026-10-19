import { settingAtom } from './settings';
import { RequestChannel } from '../ipc/ipc.generated';
import type { createStore } from 'jotai';
import type { IpcClient } from '../ipc/ipc-client';
import type { SettingsKey, SettingsValues } from '../ipc/ipc.generated';

type Store = ReturnType<typeof createStore>;
const revisions = new WeakMap<Store, Map<SettingsKey, number>>();

export async function persistSetting<K extends SettingsKey>(store: Store, ipc: IpcClient, key: K, value: NoInfer<SettingsValues[K]>): Promise<string | null> {
	let versions = revisions.get(store);
	if (!versions) {
		versions = new Map();
		revisions.set(store, versions);
	}

	const revision = (versions.get(key) ?? 0) + 1;
	versions.set(key, revision);
	const atom = settingAtom(key);
	const previous = store.get(atom);
	store.set(atom, value);
	let failure: string;
	try {
		const result = await ipc.invoke(RequestChannel.SettingsSet, key, value);
		if (result.isOk) {
			return null;
		}

		failure = result.error;
	}
	catch (error) {
		failure = error instanceof Error ? error.message : String(error);
	}

	if (versions.get(key) === revision) {
		let restored = previous;
		try {
			const result = await ipc.invoke(RequestChannel.SettingsGet, key);
			if (result.isOk) {
				restored = result.data;
			}
		}
		catch {
			// The bridge may be unavailable too. Keep the last visible value.
		}

		// A newer edit can arrive while the stored value is being read.
		if (versions.get(key) === revision) {
			store.set(atom, restored);
		}
	}

	return failure;
}
