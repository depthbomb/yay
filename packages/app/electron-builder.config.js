const { Configuration } = require('electron-builder');
const { version, author, nameLong, description, appUserModelId, applicationName } = require('../../product.json');

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Whether or not to entirely skip adding node_modules to the app's asar.
 *
 * Setting this to `true` is useful in cases where third-party package code is completely bundled
 * into your compiled app code.
 */
const EXCLUDE_ALL_NODE_MODULES = false;
/**
 * Specific package names to exclude from the app's asar when `EXCLUDE_ALL_NODE_MODULES` is false.
 *
 * If a package has dependencies then you must exclude those as well.
 */
const EXCLUDED_PACKAGES = [
	'@octokit',
	'cockatiel',
	'tree-kill',
	'ufo',
	'universal-user-agent',
	'shared',
	'mitt',
	'type-flag'
];

/**
 * @type Configuration
 */
const config = {
	appId: appUserModelId,
	executableName: applicationName,
	productName: nameLong,
	copyright: `Copyright © 2024-2025 ${author}`,
	asar: true,
	buildDependenciesFromSource: true,
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
		{ from: '../../static/extra/notifications/logo.png', to: 'notifications/logo.png' },
		//
		{ from: '../../static/extra/tray/action-icons/close.png',       to: 'tray/action-icons/close.png' },
		{ from: '../../static/extra/tray/action-icons/folder-open.png', to: 'tray/action-icons/folder-open.png' },
		{ from: '../../static/extra/tray/action-icons/logo-16.png',     to: 'tray/action-icons/logo-16.png' },
		{ from: '../../static/extra/tray/action-icons/music-note.png',  to: 'tray/action-icons/music-note.png' },
		{ from: '../../static/extra/tray/action-icons/open-in-new.png', to: 'tray/action-icons/open-in-new.png' },
		{ from: '../../static/extra/tray/action-icons/video.png',       to: 'tray/action-icons/video.png' },
		//
		{ from: '../../static/extra/tray/tray.ico',             to: 'tray/tray.ico' },
		{ from: '../../static/extra/tray/tray-downloading.ico', to: 'tray/tray-downloading.ico' },
	],
	win: {
		icon: '../../static/icon.ico',
		signtoolOptions: {
			publisherName: author
		},
	},
	portable: {
		artifactName: `${applicationName}.exe`
	},
	electronFuses: {
		runAsNode: !isProduction,
		onlyLoadAppFromAsar: isProduction,
		enableCookieEncryption: isProduction,
		enableNodeCliInspectArguments: !isProduction,
		enableNodeOptionsEnvironmentVariable: !isProduction,
		enableEmbeddedAsarIntegrityValidation: isProduction,
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
