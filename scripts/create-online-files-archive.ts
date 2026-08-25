import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { unlinkSync, readdirSync } from 'node:fs';
import { mkdir, rename, rm } from 'node:fs/promises';

const releaseFilesDir = 'build/win-unpacked';
const localesDir      = resolve(releaseFilesDir, 'locales');
const onlineFilesPath = resolve('build/release/yay-online-files.7z');
const temporaryPath   = resolve('build/release', `yay-online-files.${process.pid}.7z`);

function run7Zip(args: string[]) {
	return new Promise<void>((resolvePromise, reject) => {
		const child = spawn('7z.exe', args, {
			cwd: releaseFilesDir,
			stdio: 'inherit',
		});

		child.once('error', reject);
		child.once('exit', (code, signal) => {
			if (code === 0) {
				resolvePromise();
				return;
			}

			reject(new Error(`7-Zip failed (${signal ? `signal ${signal}` : `exit code ${code}`}).`));
		});
	});
}

async function main() {
	for (const file of readdirSync(localesDir)) {
		if (file === 'en-US.pak') {
			continue;
		}

		unlinkSync(resolve(localesDir, file));
	}

	await mkdir(dirname(onlineFilesPath), { recursive: true });
	await rm(temporaryPath, { force: true });

	try {
		await run7Zip([
			'a',
			'-t7z',
			temporaryPath,
			'*',
			'-mx=9',
			'-m0=lzma2',
			'-md=128m',
			'-mfb=64',
			'-ms=off',
			'-mmt=on',
			'-x!*.html'
		]);

		await rm(onlineFilesPath, { force: true });
		await rename(temporaryPath, onlineFilesPath);
	} finally {
		await rm(temporaryPath, { force: true });
	}
}

void main().catch(error => {
	console.error(error);
	process.exitCode = 1;
});
