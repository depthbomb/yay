import { memoize } from '@formatjs/fast-memoize';
import { join as posixJoin } from 'node:path/posix';
import { Path } from '@depthbomb/node-common/pathlib';
import { EXE_DIR, RESOURCES_PATH, MONOREPO_ROOT_PATH } from '~/constants';
import type { PathLike } from '@depthbomb/node-common/pathlib';

/**
 * Resolves the absolute path to an extra resource file path, accounting for environment.
 *
 * This function does not validate the existence of the file.
 *
 * @param paths The path to the extra resource file relative to the `<app>/resources` (production)
 * OR `<root>/static/extra` (development) directory.
 */
export function getExtraResourcePath(...paths: string[]) {
	let extraFilePath: Path;
	if (import.meta.env.DEV) {
		extraFilePath = new Path(MONOREPO_ROOT_PATH, 'static', 'extra', ...paths);
	} else {
		extraFilePath = new Path(RESOURCES_PATH, ...paths);
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
	return new Path(getExtraFileDir(), ...paths);
}

export function getExtraFileDir() {
	let extraFileDir: Path;
	if (import.meta.env.DEV) {
		extraFileDir = new Path(MONOREPO_ROOT_PATH, 'static', 'extra');
	} else {
		extraFileDir = new Path(EXE_DIR);
	}

	return extraFileDir;
}

function _getFilePathFromAsar(...paths: string[]) {
	let extraFilePath: Path;
	if (import.meta.env.DEV) {
		extraFilePath = new Path(MONOREPO_ROOT_PATH, 'static', 'extra', ...paths);
	} else {
		const path     = posixJoin(...paths);
		const parts    = path.split('/');
		const asarName = parts[0];
		const restPath = parts.slice(1).join('/');

		extraFilePath = new Path(RESOURCES_PATH, `${asarName}.asar`, restPath);
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
export const getFilePathFromAsar = <(...paths: PathLike[]) => Path>memoize(_getFilePathFromAsar);
