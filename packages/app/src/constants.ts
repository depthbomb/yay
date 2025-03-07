import { app } from 'electron';
import { product } from 'shared';
import { join, dirname } from 'node:path';

export const MIN_WIDTH    = 450 as const;
export const MIN_HEIGHT   = 550 as const;
export const APP_NAME     = product.nameLong;
export const APP_VERSION  = product.version;
export const COMPANY_NAME = product.author;
export const DEV_MODE     = !app.isPackaged;

export const ROOT_PATH = __dirname;
/**
 * This constant is for development use only. **DO NOT** use it in production as it may not return
 * an expected value.
 */
export const MONOREPO_ROOT_PATH = join(process.cwd(), '..', '..');
export const EXE_PATH           = dirname(app.getPath('exe'));
export const RESOURCES_PATH     = join(EXE_PATH, 'resources');
export const PRELOAD_PATH       = join(ROOT_PATH, 'preload.js');

export const USER_AGENT = `yay/${product.version} (github:depthbomb/yay)` as const;
