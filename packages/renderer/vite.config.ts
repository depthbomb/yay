import { DEV_PORT } from 'shared';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import babel from 'vite-plugin-babel';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { URL, fileURLToPath } from 'node:url';
import { ViteMinifyPlugin } from 'vite-plugin-minify';
import { ipcChannelObfuscationPlugin } from 'vite-plugin-ipc-channel-obf';
import type { UserConfigExport } from 'vite';

let entryID = 0;
let assetID = 0;
let chunkID = 0;

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
			emptyOutDir: !isProduction,
			sourcemap: !isProduction,
			rollupOptions: {
				input: {
					renderer: resolve('./src/renderer.html'),
				},
				output: {
					hashCharacters: 'hex',
					entryFileNames: () => `${String(entryID++).padStart(2, '0')}-[hash].js`,
					assetFileNames: () => `${String(assetID++).padStart(2, '0')}-[hash].[ext]`,
					chunkFileNames: () => `${String(chunkID++).padStart(2, '0')}-[hash].js`,
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
			ViteMinifyPlugin(),
			ipcChannelObfuscationPlugin()
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
