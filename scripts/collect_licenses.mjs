import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const [destination, manifestFile] = process.argv.slice(2);
if (!destination || !manifestFile) {
	throw new Error('Usage: collect_licenses.mjs <destination> <bundled-package-manifest>');
}

const packages = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
if (!Array.isArray(packages) || !packages.length || packages.some(directory => typeof directory !== 'string')) {
	throw new Error('The bundled package manifest must contain package directories.');
}

for (const directory of packages) {
	const manifest = path.join(directory, 'package.json');
	const { name, version } = JSON.parse(fs.readFileSync(manifest, 'utf8'));
	const output = path.join(destination, `${name.replaceAll('/', '__')}@${version}`);
	for (const filename of fs.readdirSync(directory)) {
		if (/^(licen[cs]e|copying|notice|ofl)(\.|$)/i.test(filename) && fs.statSync(path.join(directory, filename)).isFile()) {
			fs.mkdirSync(output, { recursive: true });
			fs.copyFileSync(path.join(directory, filename), path.join(output, filename));
		}
	}
}
