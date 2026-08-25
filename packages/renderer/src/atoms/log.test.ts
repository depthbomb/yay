import test from 'node:test';
import assert from 'node:assert/strict';
import { appendLogEntries, MAX_LOG_HISTORY_LENGTH } from './log';

test('log history stays bounded and retains the newest lines', () => {
	const lines = Array.from({ length: 1_000 }, (_, index) => `line ${index}`);
	const entries = appendLogEntries([], lines);

	assert.equal(entries.length, MAX_LOG_HISTORY_LENGTH);
	assert.equal(entries[0].line, 'line 750');
	assert.equal(entries[entries.length - 1]?.line, 'line 999');
	assert.equal(new Set(entries.map(entry => entry.id)).size, entries.length);
});
