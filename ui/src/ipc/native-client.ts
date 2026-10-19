import { createIpcClient } from './ipc-client';
import { RequestChannel } from './ipc.generated';
import type { IpcTransport } from './ipc-client';

export type NativeClient = Awaited<ReturnType<typeof connectNativeClient>>;

export async function connectNativeClient(transport: IpcTransport, debug: boolean) {
	const ipc = createIpcClient(transport);
	const result = await ipc.invoke(RequestChannel.NativeBootstrap);
	if (!result.isOk) {
		throw new Error('Unable to initialize the native application bridge.');
	}

	const state = result.data;
	return {
		ipc,
		system: Object.freeze(state.system),
		versions: Object.freeze(state.versions),
		buildDate: new Date(state.buildDate),
		development: debug && (state.development ?? false),
		diagnostics: debug && (state.diagnostics ?? false),
		featureFlags: state.flags,
		isWindows11: state.system.platform === 'win32' && parseInt(state.system.release.split('.')[2], 10) >= 22000,
		clipboard: Object.freeze({
			async readText() {
				const result = await ipc.invoke(RequestChannel.NativeClipboardRead);
				return result.data;
			},
			async writeText(value: string) {
				const result = await ipc.invoke(RequestChannel.NativeClipboardWrite, value);
				if (result.isErr) {
					throw new Error(result.error);
				}
			},
		}),
	};
}
