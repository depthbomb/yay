import { join } from 'node:path';
import { memoize } from '@formatjs/fast-memoize';
import { stat, mkdir, access } from 'node:fs/promises';
import { EXE_DIR, RESOURCES_PATH, MONOREPO_ROOT_PATH } from '~/constants';

/**
 * Returns `true` if the path exists, `false` otherwise.
 *
 * @param path Path to the file or directory
 */
export async function fileExists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

/**
 * Returns `true` if the path exists and is a directory, `false` otherwise
 *
 * @param path Path to the directory
 */
export async function dirExists(path: string): Promise<boolean> {
	try {
		const stats = await stat(path);
		return stats.isDirectory();
	} catch {
		return false;
	}
}

/**
 * Creates a directory from a string.
 *
 * @param directory Directory to create
 */
export async function createDir(directory: string) : Promise<void>;
/**
 * Creates a directory from an array.
 *
 * @param directories Array of directories to create
 */
export async function createDir(directories: string[]) : Promise<void>;
/**
 * Creates a directory from a string or multiple directories from an array.
 *
 * @param directory Directory to create as a string or an array of directories to create
 */
export async function createDir(directory: string | string[]) : Promise<void> {
	if (Array.isArray(directory)) {
		for (const dir of directory) {
			if (!await fileExists(dir)) {
				await mkdir(dir, { recursive: true });
			}
		}
	} else {
		if (!await fileExists(directory)) {
			await mkdir(directory, { recursive: true });
		}
	}
}

/**
 * Resolves the absolute path to an extra resource file path, accounting for environment.
 *
 * This function does not validate the existence of the file.
 *
 * @param path The path to the extra resource file relative to the `<app>/resources` (production) OR
 * `<root>/static/extra` (development) directory.
 */
export function getExtraResourcePath(path: string) {
	let extraFilePath: string;
	if (import.meta.env.DEV) {
		extraFilePath = join(MONOREPO_ROOT_PATH, 'static', 'extra', path);
	} else {
		extraFilePath = join(RESOURCES_PATH, path);
	}

	return extraFilePath;
}

/**
 * Resolves the absolute path to an extra file path, accounting for environment.
 *
 * This function does not validate the existence of the file.
 *
 * @param path The path to the extra resource file relative to the `<app>` (production) OR
 * `<root>/static/extra` (development) directory.
 */
export function getExtraFilePath(path: string) {
	let extraFilePath: string;
	if (import.meta.env.DEV) {
		extraFilePath = join(MONOREPO_ROOT_PATH, 'static', 'extra', path);
	} else {
		extraFilePath = join(EXE_DIR, path);
	}

	return extraFilePath;
}

function _getFilePathFromAsar(path: string) {
	let extraFilePath: string;
	if (import.meta.env.DEV) {
		extraFilePath = join(MONOREPO_ROOT_PATH, 'static', 'extra', path);
	} else {
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
 * @param path The path to the file located inside of an asar archive.
 */
export const getFilePathFromAsar = <(path: string) => string>memoize(_getFilePathFromAsar);
