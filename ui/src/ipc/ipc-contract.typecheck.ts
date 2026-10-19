import { createStore } from 'jotai';
import { useSetting } from '~/hooks/use-setting';
import { persistSetting } from '../atoms/persist-setting';
import { DebugRequestChannel } from './ipc.debug.generated';
import { SettingsKey, EventChannel, RequestChannel } from './ipc.generated';
import type { IpcClient } from './ipc-client';

// Compiled by tsc, never called or bundled. These failures are part of the contract.
export function checkContract(client: IpcClient) {
	void client.invoke(RequestChannel.SettingsSet, SettingsKey.DownloadDir, 'C:\\downloads');
	// @ts-expect-error Secure settings writes are no longer supported.
	void client.invoke(RequestChannel.SettingsSet, SettingsKey.DownloadDir, 'C:\\downloads', true);
	// @ts-expect-error Secure settings reads are no longer supported.
	void client.invoke(RequestChannel.SettingsGet, SettingsKey.DownloadDir, null, true);
	void client.invoke(DebugRequestChannel.NativeDiagnostics, { action: 'snapshot' });
	client.on(EventChannel.YtDlpDownloadProgress, payload => {
		const progress: number = payload.progress;
		const id: string = payload.id;
		void [progress, id];
		// @ts-expect-error Event payload fields are checked.
		payload.missing;
	});
	// @ts-expect-error Callers must use generated channels.
	void client.invoke('native<-bootstrap');
	// @ts-expect-error Request and event channels are distinct.
	void client.invoke(EventChannel.SetupDone);
	// @ts-expect-error Events also require generated channels.
	client.on('setup->done', () => { });
	// @ts-expect-error Required request arguments cannot be omitted.
	void client.invoke(RequestChannel.NativeClipboardWrite);
	// @ts-expect-error Request argument types are checked.
	void client.invoke(RequestChannel.NativeClipboardWrite, 10);
	// @ts-expect-error Settings keys come from the same generated contract.
	void client.invoke(RequestChannel.SettingsGet, 'download-dir');

	const store = createStore();
	void persistSetting(store, client, SettingsKey.EnableGlobalMenu, true);
	// @ts-expect-error The value type comes from the setting key.
	void persistSetting(store, client, SettingsKey.EnableGlobalMenu, 'true');
	// @ts-expect-error A string setting cannot accept a boolean.
	void persistSetting(store, client, SettingsKey.DownloadDir, true);
}

export function SettingTypeChecks() {
	const [enabled, setEnabled] = useSetting(SettingsKey.EnableGlobalMenu);
	void (enabled satisfies boolean);
	void setEnabled(true);
	// @ts-expect-error Callers cannot choose an unrelated setting type.
	void setEnabled('true');
	const [, setAction] = useSetting(SettingsKey.DefaultDownloadAction);
	void setAction('audio');
	// @ts-expect-error Enum settings preserve their allowed values.
	void setAction('image');
	const [, setCookies] = useSetting(SettingsKey.CookiesFilePath);
	void setCookies(null);
	void setCookies('C:\\cookies.txt');
	// @ts-expect-error Nullable settings still reject unrelated values.
	void setCookies(false);
}
