import product from '../product.json';
import { spawn } from 'node:child_process';

const definitions: { [key: string]: string } = {
	Company: product.author,
	NameLong: product.nameLong,
	DirName: product.dirName,
	Version: product.version,
	RawVersion: product.version.replace(/-\w+$/, ''),
	ExeBasename: product.applicationName,
	AppMutex: product.mutexName,
	AppId: product.appId,
	RepoURL: product.repoURL,
};
const productKeys = Object.keys(definitions);
const defs = productKeys.map(key => `/d${key}=${definitions[key]}`);
const args = [
	'./setup/setup.iss',
	...defs
];

spawn('iscc.exe', args, { stdio: ['ignore', 'inherit', 'inherit'] })
	.on('error', console.error)
	.on('exit', console.log);
