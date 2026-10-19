import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	generateProduct,
	renderChangelog,
	validateProduct,
	validateChangelog,
	renderReleaseNotes
} from '../generate_product.mjs';

const product = JSON.parse(fs.readFileSync(new URL('../../protocol/product.json', import.meta.url), 'utf8'));

test('product consumers share the same identity and version', () => {
	const generated = generateProduct(product);
	const frontend = JSON.parse(generated.typescript.slice(generated.typescript.indexOf('= ') + 2).replace(/ as const;\n$/, ''));
	assert.deepEqual(frontend, { ...product, repositoryUrl: `https://github.com/${product.repository}` });
	assert.ok(generated.header.includes(`AppVersion[] = "${product.version}"`));
	assert.ok(generated.header.includes(`AppId[] = L"${product.appUserModelId}"`));
	assert.ok(generated.installer.includes(`ProductVersion '${product.version}'`));
	assert.ok(generated.installer.includes(`ProductInstallerId '{{${product.installerId}}'`));
});

test('invalid product metadata fails before consumers are generated', () => {
	for (const invalid of [
		{ ...product, version: '2.0' },
		{ ...product, version: '65536.0.0' },
		{ ...product, installerId: 'new-id' },
		{ ...product, executable: '../yay.exe' },
		{ ...product, directoryName: '..' },
		{ ...product, webviewRuntimeUrl: 'http://example.com/runtime' },
		{ ...product, obsoleteProperty: 'value' },
		{ ...product, name: '' },
	]) {
		assert.throws(() => validateProduct(invalid));
	}
});

test('changelog generation preserves headings, descriptions, nested bullets, and separators', () => {
	const releases = [
		{ version: '2.0.0', description: 'A release.', changes: ['First change', ['Detail', ['Deeper detail']], 'Second change'] },
		{ version: '1.0.0', changes: ['Initial release'] },
	];
	validateChangelog(releases, '2.0.0');
	assert.equal(renderChangelog(releases),
		'# 2.0.0\n\nA release.\n\n- First change\n  - Detail\n    - Deeper detail\n- Second change\n\n---\n\n# 1.0.0\n\n- Initial release\n');
	assert.equal(renderReleaseNotes(releases, '1.0.0'), '- Initial release\n');
	assert.throws(() => renderReleaseNotes(releases, '3.0.0'), /No changelog/);
});

test('changelog validation rejects drift, duplicate versions, and orphaned nested bullets', () => {
	const release = { version: '2.0.0', changes: ['A change'] };
	assert.throws(() => validateChangelog([release], '3.0.0'));
	assert.throws(() => validateChangelog([release, release], '2.0.0'));
	assert.throws(() => validateChangelog([{ ...release, changes: [['Orphan']] }], '2.0.0'));
	assert.throws(() => validateChangelog([{ ...release, changes: [] }], '2.0.0'));
});
