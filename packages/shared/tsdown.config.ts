import { defineConfig } from 'tsdown';
import { execSync } from 'node:child_process';

let gitHash = 'INDEV';
try {
	gitHash = execSync('git rev-parse HEAD').toString().trim();
} catch {}

export default defineConfig((options) => ({
	clean: true,
	entry: [
		'src/index.ts',
	],
	format: ['cjs', 'esm'],
	dts: true,
	minify: true,
	skipNodeModulesBundle: false,
	splitting: false,
	sourcemap: false,
	target: 'esnext',
	tsconfig: './tsconfig.json',
	watch: options.watch,
	keepNames: false,
	define: {
		__GIT_HASH__:       JSON.stringify(gitHash),
		__GIT_HASH_SHORT__: JSON.stringify(gitHash.substring(0, 7)),
	}
}));
