import { join } from 'node:path';
import { getExtraResourcePath } from '~/utils';
import { MONOREPO_ROOT_PATH } from '~/constants';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import type { Maybe } from 'shared';

type ProcessTree = {
	pid: number;
	name: string;
	children: ProcessTree[];
};

@injectable()
export class ProcessService {
	private readonly native;

	public constructor(
		private readonly logger = inject(LoggingService)
	) {
		if (import.meta.env.DEV) {
			this.native = require(
				join(MONOREPO_ROOT_PATH, 'packages', 'windows-process-tree', 'build', 'Release', 'windows-process-tree.node')
			);
		} else {
			this.native = require(
				getExtraResourcePath('native/windows-process-tree.node')
			);
		}
	}

	public listProcesses(pid: number, cb: (tree: Maybe<ProcessTree>) => void): void {
		return this.native.getProcessTree(pid, cb);
	}

	public listProcessesAsync(pid: number): Promise<Maybe<ProcessTree>> {
		return new Promise(res => {
			this.native.getProcessTree(pid, res);
		});
	}

	public async killProcessTree(pid: number) {
		const tree = await this.listProcessesAsync(pid);
		if (!tree) {
			return;
		}

		for (const pid of [tree.pid, ...tree.children.map(c => c.pid)]) {
			this.logger.debug('Killing process', { pid });
			process.kill(pid);
		}
	}
}
