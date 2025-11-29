import { useMemo } from 'react';
import { FeatureFlags } from 'shared';
import type { FeatureFlag, FeatureFlagKey } from 'shared';

export const useFeatureFlags = () => {
	const flags = useMemo<FeatureFlag[]>(() => {
		return window.featureFlags.getFeatureFlags();
	}, []);

	const isEnabled = (key: FeatureFlagKey): boolean => {
		const def  = FeatureFlags[key];
		const flag = flags.find(f => f.uuid === def.uuid);
		return flag?.enabled ?? def.default;
	};

	return [isEnabled, flags] as const;
};
