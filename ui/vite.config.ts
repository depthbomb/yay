import { defineConfig } from 'vite';
import { dirname, resolve } from 'node:path';
import { existsSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self';";

export default defineConfig(({ mode }) => ({
    root: resolve('src'),
    base: './',
    define: {
        __YAY_DEBUG__: mode === 'development',
        __GIT_HASH__: JSON.stringify(process.env.YAY_GIT_HASH ?? 'native'),
        __GIT_HASH_SHORT__: JSON.stringify((process.env.YAY_GIT_HASH ?? 'native').slice(0, 7)),
    },
    resolve: { alias: { '~': resolve('src') } },
    css: { modules: { localsConvention: 'camelCaseOnly', generateScopedName: '[local]-[hash]' } },
    plugins: [{
        name: 'build-ipc-contract',
        enforce: 'pre',
        resolveId(source) {
            const buildRoot = process.env.YAY_IPC_DIRECTORY;
            const contract = /(?:^|\/)(ipc(?:\.debug)?\.generated)(?:\.ts)?$/.exec(source);
            if (!buildRoot || !contract) {
                return;
            }

            const filename = resolve(buildRoot, 'ui/src/ipc', contract[1] + '.ts');
            if (!existsSync(filename)) {
                this.error(`Build IPC contract is missing: ${filename}`);
            }

            return filename;
        },
    }, react(), tailwindcss(), {
        name: 'bundled-package-licenses',
        generateBundle(_options, bundle) {
            const manifest = process.env.YAY_LICENSE_MANIFEST;
            if (!manifest) {
                return;
            }

            // These tools emit runtime helpers or CSS without ordinary module imports.
            const packages = new Set(['vite', 'tailwindcss', '@tailwindcss/typography'].map(
                name => realpathSync(resolve('node_modules', name)),
            ));
            const assets = Object.values(bundle).flatMap(output => output.type === 'asset' ? output.originalFileNames : [])
                .map(filename => resolve('src', filename));
            for (const id of [...this.getModuleIds(), ...assets]) {
                if (id.startsWith('\0') || !id.replaceAll('\\', '/').includes('/node_modules/')) {
                    continue;
                }

                let directory = dirname(id.split('?')[0]);
                while (directory.replaceAll('\\', '/').includes('/node_modules/')) {
                    if (existsSync(resolve(directory, 'package.json'))) {
                        packages.add(realpathSync(directory));
                        break;
                    }
                    directory = dirname(directory);
                }
            }
            mkdirSync(dirname(manifest), { recursive: true });
            writeFileSync(manifest, JSON.stringify([...packages].sort(), null, 2) + '\n');
        },
    }, {
        name: 'content-security-policy',
        transformIndexHtml: html => html.replace(/%APP_CSP%/g, csp),
    }, {
        name: 'exclude-test-code',
        generateBundle(_options, bundle) {
            if (mode === 'development') {
                return;
            }
            for (const output of Object.values(bundle)) {
                if (output.type !== 'chunk') {
                    continue;
                }
                for (const moduleId of Object.keys(output.modules)) {
                    const filename = moduleId.split('?')[0].replaceAll('\\', '/');
                    if (/(?:^|\/)(?:tests?|__tests__)\/|\.(?:test|spec|typecheck)\.[cm]?[jt]sx?$|\/(?:diagnostics\.ts|DebugTab\.tsx|ipc\.debug\.generated\.ts)$/.test(filename)) {
                        this.error(`Debug/test module included in release UI: ${moduleId}`);
                    }
                }
            }
        },
    }],
    build: { outDir: resolve('dist'), emptyOutDir: true, rollupOptions: { input: resolve('src/renderer.html') } },
}));
