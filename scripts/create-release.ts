import { config } from 'dotenv';
import { readFileSync } from 'node:fs';
import { Octokit } from '@octokit/rest';
import changelog from '../static/changelog.json';

config();

type ChangeItem = string | ChangeItem[];

function formatChanges(changes: ChangeItem[], depth = 0) {
	const lines  = [] as string[];
	const indent = depth > 0 ? '  '.repeat(depth) : '';

	for (const change of changes) {
		if (typeof change === 'string') {
			lines.push(`${indent}- ${change}`);
		} else if (Array.isArray(change)) {
			lines.push(...formatChanges(change, depth + 1));
		}
	}

	return lines;
}

const owner         = 'depthbomb';
const repo          = 'yay';
const token         = process.env.GITHUB_TOKEN;
const setupExePath  = 'build/release/yay-setup.exe';
const archivePath   = 'build/release/yay-online-files.7z';
const latestChanges = changelog[0];

const version   = latestChanges.version;
const bodyLines = [] as string[];

if (latestChanges.description) {
	bodyLines.push(latestChanges.description, '');
}

bodyLines.push(...formatChanges(latestChanges.changes));

const body    = bodyLines.join('\n');
const octokit = new Octokit({ auth: token });

(async () => {
	const release = await octokit.repos.createRelease({
		owner,
		repo,
		tag_name: version,
		name: version,
		body,
		draft: false,
		prerelease: false,
	});

	const { upload_url } = release.data;
	for (const asset of [
		{ path: setupExePath, name: 'yay-setup.exe',       contentType: 'application/octet-stream' },
		{ path: archivePath,  name: 'yay-online-files.7z', contentType: 'application/x-7z-compressed' },
	]) {
		const data = readFileSync(asset.path);
		const url  = upload_url.replace('{?name,label}', `?name=${encodeURIComponent(asset.name)}`);
		await octokit.request({
			method: 'POST',
			url,
			headers: {
				'content-type': asset.contentType,
				'content-length': data.length,
				authorization: `token ${token}`,
			},
			data,
		});

		console.log(`Uploaded ${asset.name}`);
	}
})();
