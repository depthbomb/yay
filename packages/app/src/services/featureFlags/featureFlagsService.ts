import { app } from 'electron';
import { ok } from 'shared/ipc';
import { FeatureFlags } from 'shared';
import { IPCService } from '~/services/ipc';
import { parse, stringify } from 'smol-toml';
import { inject, injectable } from '@needle-di/core';
import { Path } from '@depthbomb/node-common/pathlib';
import type { IBootstrappable } from '~/common';
import type { FeatureFlag, FeatureFlagKey, FeatureFlagUuid } from 'shared';

export type FeatureFlagConfig = {
	version: number;
	featureFlags: FeatureFlag[];
};

@injectable()
export class FeatureFlagsService implements IBootstrappable {
	public readonly version = 1 as const;

	private readonly featureFlags = new Map<FeatureFlagUuid, FeatureFlag>();
	private readonly featureFlagsConfigPath: Path;

	public constructor(
		private readonly ipc = inject(IPCService),
	) {
		this.featureFlagsConfigPath = new Path(app.getPath('userData'), 'features.toml');
	}

	public async bootstrap() {
		this.ipc.registerSyncHandler('feature-flag<-get-feature-flags', e => (e.returnValue = ok(Array.from(this.featureFlags.values()))));

		await this.processConfig();
	}

	public isEnabled(key: FeatureFlagKey): boolean {
		const def  = FeatureFlags[key];
		const flag = this.featureFlags.get(def.uuid);

		return flag?.enabled ?? def.default;
	}

	private async processConfig() {
		for (const key of Object.keys(FeatureFlags) as FeatureFlagKey[]) {
			const def = FeatureFlags[key];
			this.featureFlags.set(def.uuid, {
				uuid: def.uuid,
				description: def.description,
				enabled: def.default,
			});
		}

		if (await this.featureFlagsConfigPath.exists()) {
			const toml = await this.featureFlagsConfigPath.readText();
			const data = parse(toml) as FeatureFlagConfig;

			if (data.version === this.version) {
				for (const { uuid, enabled } of data.featureFlags) {
					const existing = this.featureFlags.get(uuid);
					if (existing) {
						this.featureFlags.set(uuid, { ...existing, enabled });
					}
				}
			}
		}

		const configToml = stringify({
			version: this.version,
			featureFlags: Array.from(this.featureFlags.values()),
		});

		await this.featureFlagsConfigPath.writeText(configToml);
	}
}
