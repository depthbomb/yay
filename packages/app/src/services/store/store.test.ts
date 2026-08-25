import test from 'node:test';
import { Store } from './store';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parse } from 'smol-toml';
import assert from 'node:assert/strict';
import { Path } from '@depthbomb/node-common/pathlib';
import { rm, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import type { LoggingService } from '~/services/logging';

test('concurrent updates persist the latest complete settings snapshot', async t => {
	const directory = await mkdtemp(join(tmpdir(), 'yay-store-test-'));
	t.after(() => rm(directory, { recursive: true, force: true }));

	const filepath = join(directory, 'settings.toml');
	await writeFile(filepath, '', 'utf8');

	const logger = {
		debug() {},
		trace() {},
	} as unknown as LoggingService;
	const store = new Store<Record<string, unknown>>(logger, new Path(filepath));

	await Promise.all([
		store.set('alpha', 1),
		store.set('alpha', 2),
		store.set('complete', true),
	]);

	assert.deepEqual(parse(await readFile(filepath, 'utf8')), { alpha: 2, complete: true });
});
