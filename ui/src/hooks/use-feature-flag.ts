import { useMemo } from 'react';
import { native } from '~/native';
import { FeatureFlags } from '~/featureFlags';
import type { FeatureFlag, FeatureFlagKey } from '~/featureFlags';

export const useFeatureFlags = () => {
	const flags = useMemo<FeatureFlag[]>(() => native.featureFlags, []);

	const isEnabled = (key: FeatureFlagKey): boolean => {
		const def  = FeatureFlags[key];
		const flag = flags.find(f => f.uuid === def.uuid);
		return flag?.enabled ?? def.default;
	};

	return [isEnabled, flags] as const;
};
