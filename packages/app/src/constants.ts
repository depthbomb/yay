import { app } from 'electron';
import { join, dirname } from 'node:path';
import { product, GIT_HASH_SHORT } from 'shared';

export const REPO_OWNER = 'depthbomb' as const;
export const REPO_NAME  = 'yay' as const;

export const ROOT_PATH = __dirname;
/**
 * This constant is for development use only. **DO NOT** use it or any other constant that uses it
 * in production as it may not return an expected value.
 */
export const MONOREPO_ROOT_PATH = join(process.cwd(), '..', '..');
export const EXE_PATH           = app.getPath('exe');
export const EXE_DIR            = dirname(EXE_PATH);
export const RESOURCES_PATH     = join(EXE_DIR, 'resources');
export const PRELOAD_PATH       = join(ROOT_PATH, 'preload.js');

export const USER_AGENT = `yay/${product.version}+${GIT_HASH_SHORT} (github:depthbomb/yay)` as const;
