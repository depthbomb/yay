const { version, author, nameLong, description, appUserModelId, applicationName } = require('../../product.json');

const isProduction = process.env.NODE_ENV === 'production';

/** @type {import('electron-builder').Configuration} */
module.exports = {
	appId: appUserModelId,
	executableName: applicationName,
	productName: nameLong,
	copyright: `Copyright © 2024-${new Date().getFullYear()} ${author}`,
	asar: true,
	compression: 'maximum',
	downloadAlternateFFmpeg: true,
	npmRebuild: false,
	buildDependenciesFromSource: false,
	directories: {
		output: '../../build',
	},
	files: [
		'dist/**',
		'package.json',
		'!**/node_modules/**',
	],
	asarUnpack: [
		'**/*.node',
		'**/*.dll',
		'**/*.exe',
	],
	extraMetadata: {
		version,
		description,
	},
	extraFiles: [
		{ from: '../../static/extra/7za.exe',             to: '7za.exe' },
		{ from: '../../static/extra/licenses/7za.txt',    to: 'licenses/7za.txt' },
		{ from: '../../static/extra/licenses/ffmpeg.txt', to: 'licenses/ffmpeg.txt' },
	],
	extraResources: [
		{ from: '../../static/extra/notifications.asar',           to: 'notifications.asar' },
		{ from: '../../static/extra/tray.asar',                    to: 'tray.asar' },
		{ from: '../nativelib/dist/nativelib.win32-x64-msvc.node', to: 'native/nativelib.win32-x64-msvc.node' },
	],
	win: {
		icon: '../../static/icon.ico',
		verifyUpdateCodeSignature: false,
	},
	electronFuses: {
		runAsNode: !isProduction,
		onlyLoadAppFromAsar: isProduction,
		enableCookieEncryption: isProduction,
		enableNodeCliInspectArguments: !isProduction,
		enableNodeOptionsEnvironmentVariable: !isProduction,
	},
};
