import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { Octokit } from '@octokit/rest';
import { createHash } from 'node:crypto';
import { changelog } from '../product.json';

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

function createSHA256(data: Buffer) {
	return createHash('sha256').update(data).digest('hex');
}

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
		const hash = createSHA256(data);
		const checksumData = Buffer.from(`${hash}  ${asset.name}\n`, 'utf8');

		for (const upload of [
			{ name: asset.name, contentType: asset.contentType, data },
			{ name: `${asset.name}.sha256`, contentType: 'text/plain; charset=utf-8', data: checksumData },
		]) {
			const url = upload_url.replace('{?name,label}', `?name=${encodeURIComponent(upload.name)}`);
			await octokit.request({
				method: 'POST',
				url,
				headers: {
					'content-type': upload.contentType,
					'content-length': upload.data.length,
					authorization: `token ${token}`,
				},
				data: upload.data,
			});

			console.log(`Uploaded ${upload.name}`);
		}
	}
})();
