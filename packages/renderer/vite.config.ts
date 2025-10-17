import { DEV_PORT } from 'shared';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import babel from 'vite-plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import { URL, fileURLToPath } from 'node:url';
import { ViteMinifyPlugin } from 'vite-plugin-minify';
import type { UserConfigExport } from 'vite';

export default defineConfig(({ mode }) => {
	const isProduction = mode === 'production';
	const config: UserConfigExport = {
		root: resolve('./src'),
		base: '',
		build: {
			outDir: isProduction ? resolve('../app/dist') : resolve('./dist'),
			assetsDir: '.',
			emptyOutDir: false,
			sourcemap: mode !== 'production',
			minify: isProduction ? 'terser' : false,
			rollupOptions: {
				input: {
					renderer: resolve('./src/renderer.html'),
				},
				output: {
					entryFileNames: '[hash].js',
					assetFileNames: '[hash].[ext]',
					chunkFileNames: '[hash].js',
				},
			},
			terserOptions: {
				format: {
					comments: false
				}
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
