import { app } from 'electron';
import { join } from 'node:path';
import { IpcChannel } from 'shared';
import { fileExists } from '~/common';
import { IpcService } from '~/services/ipc';
import { parse, stringify } from 'smol-toml';
import { inject, injectable } from '@needle-di/core';
import { readFile, writeFile } from 'node:fs/promises';
import type { IBootstrappable } from '~/common';
import type { FeatureFlag, FeatureFlagUuids } from 'shared';

export type FeatureFlagConfig = {
	version: number;
	featureFlags: Array<FeatureFlag>;
};

@injectable()
export class FeatureFlagsService implements IBootstrappable {
	public readonly version      = 1 as const;
	public readonly featureFlags = new Set<FeatureFlag>();

	private readonly featureFlagsConfigPath: string;

	public constructor(
		private readonly ipc = inject(IpcService),
	) {
		this.featureFlagsConfigPath = join(app.getPath('userData'), 'features.toml');
	}

	public async bootstrap() {
		this.ipc.registerSyncHandler('feature-flag<-get-feature-flags', e => e.returnValue = Array.from(this.featureFlags));

		await this.processConfig();
	}

	public set(uuid: typeof FeatureFlagUuids[number], description: string, enabled: boolean) {
		const featureFlag         = { uuid, description, enabled };
		const existingFeatureFlag = this.featureFlags.values().find(f => f.uuid === uuid);
		if (existingFeatureFlag) {
			this.featureFlags.delete(existingFeatureFlag);
		}

		this.featureFlags.add(featureFlag);
	}

	public isEnabled(uuid: typeof FeatureFlagUuids[number]) {
		const featureFlag = this.featureFlags.values().find(f => f.uuid === uuid);
		if (!featureFlag) {
			throw new Error(`Invalid feature flag UUID: ${uuid}`);
		}

		return featureFlag.enabled;
	}

	private async processConfig() {
		const configExists = await fileExists(this.featureFlagsConfigPath);
		if (configExists) {
			const toml = await readFile(this.featureFlagsConfigPath, 'utf8');
			const data = parse(toml) as FeatureFlagConfig;
			if (data.version === this.version) {
				for (const { uuid, description, enabled } of data.featureFlags) {
					this.set(uuid, description, enabled);
				}
			}
		}

		const configToml = stringify({ version: this.version, featureFlags: Array.from(this.featureFlags) });
		await writeFile(this.featureFlagsConfigPath, configToml, 'utf8');
	}
}
