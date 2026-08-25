import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import type { UserConfig } from 'vite';

export default defineConfig(({ mode }) => {
	const isProduction = mode === 'production';
	const config: UserConfig = {
		root: resolve('./src'),
		build: {
			target: 'node24',
			outDir: resolve('./dist'),
			emptyOutDir: false,
			sourcemap: !isProduction,
			minify: isProduction,
			lib: {
				entry: resolve('./src/preload.ts'),
				formats: ['cjs'],
				fileName: () => 'preload.js',
			},
			rollupOptions: {
				external: ['electron'],
			},
		},
		define: {
			__STRICT__: isProduction,
			__BUILD_DATE__: new Date(),
		},
	};

	return config;
});
