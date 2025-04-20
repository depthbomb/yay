import { useMemo } from 'react';
import { FeatureFlagUuids } from 'shared';

export const useFeatureFlags = () => {
	const flags = useMemo(() => window.featureFlags.getFeatureFlags(), []);

	const isEnabled = (uuid: typeof FeatureFlagUuids[number]): boolean => {
		const flag = flags.find(f => f.uuid === uuid);
		return flag?.enabled ?? false;
	};

	return [isEnabled] as const;
}
