import { DEV_PORT } from 'shared';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import babel from 'vite-plugin-babel';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { URL, fileURLToPath } from 'node:url';
import { ViteMinifyPlugin } from 'vite-plugin-minify';
import type { UserConfigExport } from 'vite';

export default defineConfig(({ mode }) => {
	const isProduction = mode === 'production';
	const config: UserConfigExport = {
		root: resolve('./src'),
		base: '',
		css: {
			modules: {
				localsConvention: 'camelCaseOnly',
				generateScopedName: '[local]-[hash]'
			}
		},
		json: {
			stringify: true
		},
		build: {
			outDir: isProduction ? resolve('../app/dist') : resolve('./dist'),
			assetsDir: '.',
			emptyOutDir: false,
			sourcemap: mode !== 'production',
			rollupOptions: {
				input: {
					renderer: resolve('./src/renderer.html'),
				},
				output: {
					hashCharacters: 'hex',
					entryFileNames: '[hash].js',
					assetFileNames: '[hash].[ext]',
					chunkFileNames: '[hash].js',
				},
			},
		},
		plugins: [
			react(),
			babel({
				babelConfig: {
					plugins: ['babel-plugin-react-compiler'],
				},
			}),
			tailwindcss(),
			ViteMinifyPlugin()
		],
		resolve: {
			alias: {
				'~': fileURLToPath(new URL('./src', import.meta.url))
			}
		},
	};

	if (mode !== 'production') {
		config.server = {
			port: DEV_PORT
		};
	}

	return config;
});
