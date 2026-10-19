const HALLOWEEN_MONTH  = 9 as const;
const HALLOWEEN_DAY    = 31 as const;
const EFFECT_LEAD_DAYS = 7 as const;

export function getHalloweenEffectChance(date: Date) {
	if (date.getMonth() !== HALLOWEEN_MONTH) {
		return 0;
	}

	const daysUntilHalloween = HALLOWEEN_DAY - date.getDate();
	if (daysUntilHalloween < 0 || daysUntilHalloween > EFFECT_LEAD_DAYS) {
		return 0;
	}

	if (daysUntilHalloween === 0) {
		return 1;
	}

	return (EFFECT_LEAD_DAYS - daysUntilHalloween + 1) / 10;
}
