import { spawn } from 'node:child_process';

const releaseFilesDir = 'build/win-unpacked';
const onlineFilesPath = '../../build/release/yay-online-files.7z';

spawn('7z.exe',
	[
		'a',
		'-t7z',
		onlineFilesPath,
		`*`,
		'-mx=9',
		'-m0=lzma2',
		'-md=128m',
		'-mfb=64',
		'-ms=on',
		'-mmt=on'
	], {
		cwd: releaseFilesDir
	}
);
