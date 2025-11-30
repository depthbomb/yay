import { join } from 'node:path';
import * as nativelib from 'nativelib';
import { getExtraResourcePath } from '~/common';
import { MONOREPO_ROOT_PATH } from '~/constants';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';

@injectable()
export class ProcessService {
	private readonly native: typeof nativelib;

	public constructor(
		private readonly logger = inject(LoggingService)
	) {
		if (import.meta.env.DEV) {
			this.native = require(
				join(MONOREPO_ROOT_PATH, 'packages', 'nativelib', 'dist', 'nativelib.win32-x64-msvc.node')
			);
		} else {
			this.native = require(
				getExtraResourcePath('native', 'nativelib.win32-x64-msvc.node')
			);
		}
	}

	public getProcessTree(pid: number) {
		return this.native.getProcessTree(pid);
	}

	public async killProcessTree(pid: number) {
		const tree = await this.getProcessTree(pid);
		if (!tree) {
			return;
		}

		for (const pid of [tree.pid, ...tree.children.map(c => c.pid)]) {
			this.logger.debug('Killing process', { pid });
			process.kill(pid);
		}
	}
}
