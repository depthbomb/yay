import crypto from 'node:crypto';
import type { Plugin } from 'vite';

export interface ITokenExpandOptions {
	include?: RegExp | RegExp[];
	exclude?: RegExp | RegExp[];
	globalCache?: boolean;
}

type GeneratorContext = {
	type: string;
	seed?: string;
	args?: string;
	opts?: string;
};

type Generator = (ctx: GeneratorContext) => string;

const ALPHA    = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ' as const;
const ID_START = `${ALPHA}_$` as const;
const ID_BODY  = `${ID_START}0123456789` as const;
const TOKEN    = /@(?<type>[a-zA-Z0-9_-]+)(?:!(?<opts>[a-z]+))?(?:\((?<seed>[^)]+)\))?(?::(?<args>[^@]+))?@/g;
const ESCAPE   = /@@([^@]+?)@@/g;

class GeneratorRegistry {
	#map = new Map<string, Generator>();

	register(name: string, gen: Generator) {
		this.#map.set(name, gen);
	}

	get(name: string) {
		const g = this.#map.get(name);
		if (!g) {
			throw new Error(`Unknown generator: ${name}`);
		}

		return g;
	}

	entries() {
		return [...this.#map.entries()];
	}
}

const registry = new GeneratorRegistry();

function randomBytes(len: number): Buffer {
	return crypto.randomBytes(len);
}

function hashSeed(seed: string): Buffer {
	return crypto.createHash('sha256').update(seed).digest();
}

function pick(chars: string, byte: number) {
	return chars[byte % chars.length];
}

function enforceAlphaFirst(value: string, seed?: string): string {
	if (!/^[0-9]/.test(value)) {
		return value;
	}

	const b = seed ? hashSeed(seed)[0] : randomBytes(1)[0];

	return pick(ALPHA, b) + value.slice(1);
}

function enforceIdentifier(value: string, seed?: string): string {
	const h = seed ? hashSeed(seed) : randomBytes(value.length);

	let out = '';
	out += pick(ID_START, h[0]);

	for (let i = 1; i < value.length; i++) {
		out += pick(ID_BODY, h[i % h.length]);
	}

	return out;
}

export function defineGenerators(defs: Record<string, Generator>) {
	for (const [k, v] of Object.entries(defs)) {
		registry.register(k, v);
	}
}

defineGenerators({
	hex: ({ seed, args }) => {
		const len   = Number(args ?? 32);
		const bytes = Math.ceil(len / 2);
		const buf   = seed
			? crypto.createHmac('sha256', hashSeed(seed)).update('hex').digest()
			: randomBytes(bytes);
		return buf.toString('hex').slice(0, len);
	},

	base64: ({ seed, args }) => {
		const len = Number(args ?? 32);
		const buf = seed
			? crypto.createHmac('sha256', hashSeed(seed)).update('base64').digest()
			: randomBytes(len);
		return buf.toString('base64').replace(/=+/g, '').slice(0, len);
	},

	base64url: ({ seed, args }) => {
		const len = Number(args ?? 32);
		const buf = seed
			? crypto.createHmac('sha256', hashSeed(seed)).update('base64url').digest()
			: randomBytes(len);
		return buf.toString('base64url').replace(/=+/g, '').slice(0, len);
	},

	uuid: ({ seed }) => {
		if (!seed) {
			return crypto.randomUUID();
		}

		const h = hashSeed(seed);
		h[6] = (h[6] & 0x0f) | 0x40;
		h[8] = (h[8] & 0x3f) | 0x80;

		const x = h.toString('hex');

		return `${x.slice(0,8)}-${x.slice(8,12)}-${x.slice(12,16)}-${x.slice(16,20)}-${x.slice(20,32)}`;
	},
});

function expand(code: string, cache: Map<string, string>) {
	const escaped = [] as string[];

	code = code.replace(ESCAPE, (_, v) => {
		escaped.push(v);
		return `\0ESC${escaped.length - 1}\0`;
	});

	code = code.replace(TOKEN, (...args) => {
		const groups = args.at(-1) as {
			type?: string;
			opts?: string;
			seed?: string;
			args?: string;
		};

		if (!groups?.type) {
			throw new Error('[vite-token-expand] Token matched but no type was captured');
		}

		const { type, seed, opts, args: genArgs } = groups;
		const key = [
			type ?? '',
			opts ?? '',
			seed ?? '',
			String(genArgs ?? ''),
		].join('|');

		if (cache.has(key)) {
			return cache.get(key)!;
		}

		let out = registry.get(type)({ type, seed, args: genArgs!, opts });

		if (opts?.includes('a')) {
			out = enforceAlphaFirst(out, seed);
		}

		if (opts?.includes('id')) {
			out = enforceIdentifier(out, seed);
		}

		cache.set(key, out);

		return out;
	});

	return code.replace(/\0ESC(\d+)\0/g, (_1, i) => escaped[+i]);
}

export function tokenExpandPlugin({ globalCache = true }: ITokenExpandOptions = {}): Plugin {
	const cache = new Map<string, string>();

	let isProduction = false;

	return {
		name: 'vite-token-expand',
		enforce: 'pre',
		buildStart() {
			console.log('[token-expand] buildStart');
		},
		config(_1, { mode }) {
			isProduction = mode.toLocaleLowerCase() !== 'development';
		},
		transform(code, id) {
			if (id.includes('node_modules') || !id.endsWith('.ts')) {
				return;
			}

			const local = globalCache ? cache : new Map();
			const out   = expand(code, local);
			if (out === code) {
				return;
			}

			return { code: out, map: null };
		},
	};
}
