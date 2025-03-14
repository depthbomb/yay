import { app } from 'electron';
import { join, dirname } from 'node:path';
import { product, GIT_HASH } from 'shared';

export const ROOT_PATH = __dirname;
/**
 * This constant is for development use only. **DO NOT** use it in production as it may not return
 * an expected value.
 */
export const MONOREPO_ROOT_PATH = join(process.cwd(), '..', '..');
export const EXE_PATH           = dirname(app.getPath('exe'));
export const RESOURCES_PATH     = join(EXE_PATH, 'resources');
export const PRELOAD_PATH       = join(ROOT_PATH, 'preload.js');

export const USER_AGENT = `yay/${product.version}+${GIT_HASH} (github:depthbomb/yay)` as const;
