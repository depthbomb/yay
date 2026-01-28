import crypto from 'node:crypto';
import type { Plugin } from 'vite';

export type ReplacementRule = {
	pattern: RegExp;
	generator: (match: string, id: string) => string;
};

export interface IObfuscationPluginOptions {
	rules: ReplacementRule[];
	exclude?: (id: string) => boolean;
}

export function obfuscationPlugin(options: IObfuscationPluginOptions = {
	rules: [
		// IPC channel names
		{
			pattern: /\b[a-zA-Z][\w-]*(?:<-|->)[a-zA-Z][\w-]*\b/g,
			generator(match, _1) {
				const hash = crypto
					.createHash('sha512')
					.update(match)
					.digest('base64')
					.slice(0, 6);

				return `ipc#${hash}`;
			},
		}
	]
}): Plugin {
	const { rules, exclude } = options;

	return {
		name: 'vite-obfuscation',
		enforce: 'pre',
		transform(code, id) {
			if (exclude?.(id) ?? id.includes('node_modules')) {
				return null;
			}

			let replaced = false;
			let result   = code;

			for (const { pattern, generator } of rules) {
				result = result.replace(pattern, (match) => {
					replaced = true;
					return generator(match, id);
				});
			}

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

export * from './lib/token-expand';
