import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { unlinkSync, readdirSync } from 'node:fs';

const releaseFilesDir = 'build/win-unpacked';
const localesDir      = resolve(releaseFilesDir, 'locales');
const onlineFilesPath = '../../build/release/yay-online-files.7z';

for (const file of readdirSync(localesDir)) {
	if (file === 'en-US.pak') {
		continue;
	}

	unlinkSync(resolve(localesDir, file));
}

spawn('7z.exe',
	[
		'a',
		'-t7z',
		onlineFilesPath,
		'*',
		'-mx=9',
		'-m0=lzma2',
		'-md=128m',
		'-mfb=64',
		'-ms=on',
		'-mmt=on',
		'-x!*.html'
	], {
		cwd: releaseFilesDir
	}
);
