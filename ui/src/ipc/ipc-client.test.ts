import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createIpcClient } from './ipc-client';
import { EventChannel, RequestChannel } from './ipc.generated';
import type { IpcTransport } from './ipc-client';

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
	const client = createIpcClient(transport);
	return {
		client,
		sent,
		receive(data: unknown) {
			receive({ data } as MessageEvent);
		},
	};
}

test('requests keep their arguments and resolve by id even when replies arrive out of order', async () => {
	const { client, sent, receive } = fixture();
	const first = client.invoke(RequestChannel.YtDlpDownloadVideo, 'https://example.test/video');
	const second = client.invoke(RequestChannel.YtDlpDownloadAudio, 'https://example.test/audio');
	assert.deepEqual(sent, [
		{ id: 1, channel: 'yt-dlp<-download-video', args: ['https://example.test/video'] },
		{ id: 2, channel: 'yt-dlp<-download-audio', args: ['https://example.test/audio'] },
	]);

	const ok = { isOk: true, isErr: false, data: {} };
	const error = { isOk: false, isErr: true, error: 'Download failed' };
	receive({ id: 2, result: error });
	receive({ id: 1, result: ok });
	receive({ id: 1, result: error });
	receive({ id: 500, result: ok });
	assert.deepEqual(await first, ok);
	assert.deepEqual(await second, error);
	assert.ok(Object.isFrozen(client));
});

test('listener removal, duplicate subscriptions, and one-shot listeners keep their current semantics', () => {
	const { client, receive } = fixture();
	const calls: number[] = [];
	const listener = (value: number) => calls.push(value);
	const remove = client.on(EventChannel.MainHeartbeat, listener);
	client.on(EventChannel.MainHeartbeat, listener);
	receive({ channel: 'main->heartbeat', payload: 1 });
	assert.deepEqual(calls, [1]);
	remove();
	remove();
	receive({ channel: 'main->heartbeat', payload: 2 });
	assert.deepEqual(calls, [1]);

	client.once(EventChannel.MainHeartbeat, value => {
		calls.push(value);
		receive({ channel: 'main->heartbeat', payload: 4 });
	});
	receive({ channel: 'main->heartbeat', payload: 3 });
	assert.deepEqual(calls, [1, 3]);

	client.on(EventChannel.MainHeartbeat, listener);
	client.off(EventChannel.MainHeartbeat, listener);
	receive({ channel: 'main->heartbeat', payload: 5 });
	assert.deepEqual(calls, [1, 3]);
});

test('subscription changes during dispatch take effect on the next event', () => {
	const { client, receive } = fixture();
	const calls: string[] = [];
	const second = () => calls.push('second');
	const third = () => calls.push('third');
	client.on(EventChannel.MainHeartbeat, () => {
		calls.push('first');
		client.off(EventChannel.MainHeartbeat, second);
		client.on(EventChannel.MainHeartbeat, third);
	});
	client.on(EventChannel.MainHeartbeat, second);
	receive({ channel: 'main->heartbeat', payload: 1 });
	receive({ channel: 'main->heartbeat', payload: 2 });
	assert.deepEqual(calls, ['first', 'second', 'first', 'third']);
});

test('channel removal leaves other channels intact and stale removers cannot remove new subscriptions', () => {
	const { client, receive } = fixture();
	const calls: number[] = [];
	const listener = (value: number) => calls.push(value);
	const remove = client.on(EventChannel.MainHeartbeat, listener);
	client.on(EventChannel.WindowIsFocused, () => calls.push(99));
	client.removeAllListeners(EventChannel.MainHeartbeat);
	client.on(EventChannel.MainHeartbeat, listener);
	remove();
	receive({ channel: 'main->heartbeat', payload: 1 });
	receive({ channel: 'window->is-focused' });
	receive(null);
	receive({});
	receive({ channel: 'unknown-event', payload: 1 });
	assert.deepEqual(calls, [1, 99]);
});

test('a synchronous transport error rejects the invocation', async () => {
	const client = createIpcClient({
		postMessage() {
			throw new Error('Transport unavailable');
		},
		addEventListener() { },
	});
	await assert.rejects(client.invoke(RequestChannel.SettingsGetAll), /Transport unavailable/);
});
