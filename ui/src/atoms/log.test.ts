import test from 'node:test';
import { createStore } from 'jotai';
import assert from 'node:assert/strict';
import { logAtom, shiftLogAtom, appendLogEntries, MAX_LOG_HISTORY_LENGTH } from './log';

test('log history stays bounded and retains the newest lines', () => {
	const lines = Array.from({ length: 1_000 }, (_, index) => `line ${index}`);
	const entries = appendLogEntries([], lines);

	assert.equal(entries.length, MAX_LOG_HISTORY_LENGTH);
	assert.equal(entries[0].line, 'line 750');
	assert.equal(entries[entries.length - 1]?.line, 'line 999');
	assert.equal(new Set(entries.map(entry => entry.id)).size, entries.length);
});

test('appending retains existing entry identities without mutating the previous history', () => {
	const previous = appendLogEntries([], ['first', 'second']);
	const next = appendLogEntries(previous, ['third']);
	assert.deepEqual(previous.map(entry => entry.line), ['first', 'second']);
	assert.deepEqual(next.map(entry => entry.line), ['first', 'second', 'third']);
	assert.equal(next[0], previous[0]);
	assert.equal(next[1], previous[1]);
	assert.equal(next[2].id, previous[1].id + 1);
});

test('discarded lines still consume IDs and a full batch replaces old history', () => {
	const previous = appendLogEntries([], ['old']);
	const lines = Array.from({ length: 1_000 }, (_, index) => `line ${index}`);
	const next = appendLogEntries(previous, lines);
	assert.equal(next[0].id, previous[0].id + 751);
	assert.equal(next[249].id, previous[0].id + 1_000);
	assert.equal(appendLogEntries(next, ['last'])[249].id, next[249].id + 1);
});

test('an empty append returns a new bounded history without assigning IDs', () => {
	const previous = appendLogEntries([], ['first']);
	const emptyAppend = appendLogEntries(previous, []);
	assert.deepEqual(emptyAppend, previous);
	assert.notEqual(emptyAppend, previous);
	assert.equal(appendLogEntries(emptyAppend, ['second'])[1].id, previous[0].id + 1);
	assert.deepEqual(appendLogEntries([], []), []);
});

test('shifting removes only the oldest entry and preserves the previous snapshot', () => {
	const store = createStore();
	const previous = appendLogEntries([], ['first', 'second']);
	store.set(logAtom, previous);
	store.set(shiftLogAtom);
	assert.deepEqual(store.get(logAtom), [previous[1]]);
	assert.equal(previous.length, 2);
	store.set(shiftLogAtom);
	store.set(shiftLogAtom);
	assert.deepEqual(store.get(logAtom), []);
});
