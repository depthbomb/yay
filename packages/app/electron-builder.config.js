const { Configuration } = require('electron-builder');
const { version, author, nameLong, description, appUserModelId, applicationName } = require('../../product.json');

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Whether or not to entirely skip adding node_modules to the app's asar.
 *
 * Setting this to `true` is useful in cases where third-party package code is completely bundled
 * into your compiled app code.
 */
const EXCLUDE_ALL_NODE_MODULES = true;
/**
 * Specific package names to exclude from the app's asar when `EXCLUDE_ALL_NODE_MODULES` is false.
 *
 * If a package has dependencies then you must exclude those as well.
 */
const EXCLUDED_PACKAGES = [];

/**
 * @type Configuration
 */
const config = {
	appId: appUserModelId,
	executableName: applicationName,
	productName: nameLong,
	copyright: `Copyright © 2024-${new Date().getFullYear()} ${author}`,
	asar: true,
	buildDependenciesFromSource: true,
	downloadAlternateFFmpeg: true,
	compression: 'maximum',
	directories: {
		output: '../../build'
	},
	files: [
		'dist/*',
		'package.json',
	],
	asarUnpack: [
		'*.node',
		'*.dll',
		'*.exe',
	],
	extraMetadata: {
		version,
		description
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
		verifyUpdateCodeSignature: false
	},
	electronFuses: {
		runAsNode: !isProduction,
		onlyLoadAppFromAsar: isProduction,
		enableCookieEncryption: isProduction,
		enableNodeCliInspectArguments: !isProduction,
		enableNodeOptionsEnvironmentVariable: !isProduction,
	}
};

if (EXCLUDE_ALL_NODE_MODULES) {
	config.files.push('!node_modules');
} else {
	for (const excludedPackage of EXCLUDED_PACKAGES) {
		config.files.push(`!node_modules/${excludedPackage}`);
	}
}

exports.default = config;
