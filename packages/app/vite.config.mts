import { resolve } from 'node:path';
import { builtinModules } from 'module';
import { loadEnv, defineConfig } from 'vite';
import type { UserConfigExport } from 'vite';

const { platform } = process;

export default defineConfig(({ mode }) => {
	const isProduction = mode === 'production';
	const env = loadEnv(mode, process.cwd(), '');
	const config: UserConfigExport = {
		root: resolve('./src'),
		base: '',
		assetsInclude: '**/*.node',
		build: {
			target: 'node24',
			outDir: resolve('./dist'),
			assetsDir: '.',
			emptyOutDir: true,
			sourcemap: !isProduction,
			minify: isProduction ? 'terser' : false,
			lib: {
				entry: {
					app: resolve('./src/index.ts'),
					preload: resolve('./src/preload.ts'),
				},
				formats: ['cjs']
			},
			rollupOptions: {
				output: {
					hashCharacters: 'hex',
					entryFileNames: '[name].js',
					assetFileNames: '[hash].[ext]',
					chunkFileNames: '[hash].js',
				},
				external: [
					'electron',
					'original-fs',
					'node:original-fs',
					...builtinModules.flatMap(p => [p, `node:${p}`]),
				]
			},
			terserOptions: {
				format: {
					comments: false
				}
			},
		},
		define: {
			__WIN32__: platform === 'win32',
			__MACOS__: platform === 'darwin',
			__LINUX__: platform === 'linux',
			__STRICT__: isProduction,
			__BUILD_DATE__: new Date(),
			__GITHUB_ACCESS_TOKEN__: JSON.stringify(env.GITHUB_ACCESS_TOKEN),
		},
		resolve: {
			alias: {
				'~': resolve('./src'),
			}
		},
	};

	return config;
});
