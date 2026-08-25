import product from '../product.json';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';

const archivePath = 'build/release/yay-online-files.7z';

async function createSHA256(path: string) {
	const hash = createHash('sha256');

	for await (const chunk of createReadStream(path)) {
		hash.update(chunk);
	}

	return hash.digest('hex');
}

function runCompiler(args: string[]) {
	return new Promise<void>((resolve, reject) => {
		const child = spawn('iscc.exe', args, { stdio: ['ignore', 'inherit', 'inherit'] });

		child.once('error', reject);
		child.once('exit', (code, signal) => {
			if (code === 0) {
				resolve();
				return;
			}

			reject(new Error(`Inno Setup failed (${signal ? `signal ${signal}` : `exit code ${code}`}).`));
		});
	});
}

async function main() {
	const definitions: { [key: string]: string } = {
		Company: product.author,
		NameLong: product.nameLong,
		Description: product.description,
		Copyright: `Copyright (C) 2024-${new Date().getFullYear()} ${product.author}`,
		DirName: product.dirName,
		Version: product.version,
		RawVersion: product.version.replace(/-\w+$/, ''),
		ExeBasename: product.applicationName,
		AppID: product.appID,
		AppUserModelID: product.appUserModelID,
		AppUserModelToastActivatorClsid: product.clsid,
		RepoURL: product.repoURL,
		ArchiveSHA256: await createSHA256(archivePath),
	};
	const productKeys = Object.keys(definitions);
	const defs = productKeys.map(key => `/d${key}=${definitions[key]}`);
	const args = [
		'./setup/setup.iss',
		...defs
	];

	await runCompiler(args);
}

void main().catch(error => {
	console.error(error);
	process.exitCode = 1;
});
