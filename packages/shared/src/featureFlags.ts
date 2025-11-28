export type FeatureFlagKey  = keyof typeof FeatureFlags;
export type FeatureFlagUuid = typeof FeatureFlags[FeatureFlagKey]['uuid'];
export type FeatureFlag     = { uuid: FeatureFlagUuid; description: string; enabled: boolean; };

export const FeatureFlags = {
	SeasonalEffects: {
		uuid: '0196518a-ab04-74b7-b69f-98f85176382a',
		description: 'Enable seasonal effects',
		default: true,
	},
	RESTServer: {
		uuid: 'f167c95c-7d2d-4674-8dbd-564e57467faa',
		description: 'Enable local REST server',
		default: true,
	},
} as const;
