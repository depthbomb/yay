export type FeatureFlagKey  = keyof typeof FeatureFlags;
export type FeatureFlagUuid = typeof FeatureFlags[FeatureFlagKey]['uuid'];
export type FeatureFlag     = { uuid: FeatureFlagUuid; description: string; enabled: boolean; };

export const FeatureFlags = {
	SeasonalEffects: {
		uuid: '0196518a-ab04-74b7-b69f-98f85176382a',
		description: 'Enable seasonal effects',
		default: true,
	},
	FancyMenus: {
		uuid: 'ed25052a-531e-4147-b91c-5b123adf0fe7',
		description: 'Enable fancy menus',
		default: false,
	},
} as const;
