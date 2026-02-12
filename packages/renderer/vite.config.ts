import { DEV_PORT } from 'shared';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import babel from 'vite-plugin-babel';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { URL, fileURLToPath } from 'node:url';
import { ViteMinifyPlugin } from 'vite-plugin-minify';
import { obfuscationPlugin } from 'vite-plugin-obfuscation';
import type { UserConfigExport } from 'vite';

let entryID = 0;
let assetID = 0;
let chunkID = 0;

export default defineConfig(({ mode }) => {
	const isProduction = mode === 'production';
	const cspContent  = isProduction
		? `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';`
		: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https: http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';`;
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
			{
				name: 'inject-csp',
				transformIndexHtml(html) {
					return html.replace(/%APP_CSP%/g, cspContent);
				},
			},
			react(),
			babel({
				babelConfig: {
					plugins: ['babel-plugin-react-compiler'],
				},
			}),
			tailwindcss(),
			ViteMinifyPlugin(),
			obfuscationPlugin()
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
