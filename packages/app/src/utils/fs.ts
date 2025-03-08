import { join } from 'node:path';
import { mkdir, access } from 'node:fs/promises';
import { EXE_PATH, RESOURCES_PATH, MONOREPO_ROOT_PATH } from '~/constants';

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
		extraFilePath = join(EXE_PATH, path);
	}

	return extraFilePath;
}
