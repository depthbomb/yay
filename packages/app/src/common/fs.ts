import { join } from 'node:path';
import { memoize } from '@formatjs/fast-memoize';
import { EXE_DIR, RESOURCES_PATH, MONOREPO_ROOT_PATH } from '~/constants';

/**
 * Resolves the absolute path to an extra resource file path, accounting for environment.
 *
 * This function does not validate the existence of the file.
 *
 * @param paths The path to the extra resource file relative to the `<app>/resources` (production)
 * OR `<root>/static/extra` (development) directory.
 */
export function getExtraResourcePath(...paths: string[]) {
	let extraFilePath: string;
	if (import.meta.env.DEV) {
		extraFilePath = join(MONOREPO_ROOT_PATH, 'static', 'extra', ...paths);
	} else {
		extraFilePath = join(RESOURCES_PATH, ...paths);
	}

	return extraFilePath;
}

/**
 * Resolves the absolute path to an extra file path, accounting for environment.
 *
 * This function does not validate the existence of the file.
 *
 * @param paths The path to the extra resource file relative to the `<app>` (production) OR
 * `<root>/static/extra` (development) directory.
 */
export function getExtraFilePath(...paths: string[]) {
	return join(getExtraFileDir(), ...paths);
}

export function getExtraFileDir() {
	let extraFileDir: string;
	if (import.meta.env.DEV) {
		extraFileDir = join(MONOREPO_ROOT_PATH, 'static', 'extra');
	} else {
		extraFileDir = EXE_DIR;
	}

	return extraFileDir;
}

function _getFilePathFromAsar(...paths: string[]) {
	let extraFilePath: string;
	if (import.meta.env.DEV) {
		extraFilePath = join(MONOREPO_ROOT_PATH, 'static', 'extra', ...paths);
	} else {
		const path     = join(...paths);
		const parts    = path.split('/');
		const asarName = parts[0];
		const restPath = parts.slice(1).join('/');

		extraFilePath = join(RESOURCES_PATH, `${asarName}.asar`, restPath);
	}

	return extraFilePath;
}

/**
 * Resolves the path to a file located inside of an asar archive.
 *
 * The first part of the path will be treated as the asar archive name. For example the path
 * `assets/myfile.png`, this function will return `<resources>/assets.asar/myfile.png`. In
 * development, it will instead return `<root>/static/extra/<path>`.
 *
 * @param paths The path to the file located inside of an asar archive.
 */
export const getFilePathFromAsar = <(...paths: string[]) => string>memoize(_getFilePathFromAsar);
