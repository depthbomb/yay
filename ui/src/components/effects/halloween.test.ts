import test from 'node:test';
import assert from 'node:assert/strict';
import { getHalloweenEffectChance } from './halloween';

test('Halloween effect chance increases each day during the preceding week', () => {
	const expectedChances = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7];

	for (const [dayOffset, expectedChance] of expectedChances.entries()) {
		assert.equal(getHalloweenEffectChance(new Date(2026, 9, 24 + dayOffset)), expectedChance);
	}
});

test('Halloween effect is guaranteed on Halloween and disabled outside its window', () => {
	assert.equal(getHalloweenEffectChance(new Date(2026, 9, 31)), 1);
	assert.equal(getHalloweenEffectChance(new Date(2026, 9, 23)), 0);
	assert.equal(getHalloweenEffectChance(new Date(2026, 10, 1)), 0);
});
