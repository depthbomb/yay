import { defineConfig } from 'tsdown';

export default defineConfig({
	clean: true,
	entry: [
		'src/index.ts'
	],
	format: 'esm',
	dts: true,
	minify: true,
	skipNodeModulesBundle: true,
	target: 'node24',
	exports: {
		legacy: true,
		packageJson: false,
	},
	tsconfig: './tsconfig.json'
});
