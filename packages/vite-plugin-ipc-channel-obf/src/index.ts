import crypto from 'node:crypto';
import type { Plugin } from 'vite';

export * from './lib/token-expand';

const ARROW_PATTERN = /\b[a-zA-Z][\w-]*(?:<-|->)[a-zA-Z][\w-]*\b/g;

function channelId(input: string): string {
	const hash = crypto
		.createHash('sha512')
		.update(input)
		.digest('base64')
		.slice(0, 6);

	return `ipc#${hash}`;
}

export function ipcChannelObfuscationPlugin(): Plugin {
	return {
		name: 'vite-ipc-channel-obf',
		enforce: 'pre',
		transform(code, id) {
			if (id.includes('node_modules')) {
				return null;
			}

			let replaced = false;
			const result = code.replace(ARROW_PATTERN, (match) => {
				replaced = true;
				return channelId(match);
			});

			if (!replaced) {
				return null;
			}

			return {
				code: result,
				map: null
			};
		}
	};
}
