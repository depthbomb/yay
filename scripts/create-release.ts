import { config } from 'dotenv';
import { readFileSync } from 'node:fs';
import { Octokit } from '@octokit/rest';

config();

const owner        = 'depthbomb';
const repo         = 'yay';
const token        = process.env.GITHUB_TOKEN;
const setupExePath = 'build/release/yay-setup.exe';
const archivePath  = 'build/release/yay-online-files.7z';
const changelog    = readFileSync('./CHANGELOG.md', 'utf8').replace(/\r\n/g, '\n');
const match        = changelog.match(/^# (\d+\.\d+\.\d+)\s*\n+([\s\S]*?)(?:\n# |\n*$)/);
if (!match) {
	throw new Error('Could not find latest version in CHANGELOG.md');
}

const version     = match[1];
const body        = match[2].trim();
const tag         = version;
const releaseName = tag;
const octokit     = new Octokit({ auth: token });

(async () => {
	const release = await octokit.repos.createRelease({
		owner,
		repo,
		tag_name: tag,
		name: releaseName,
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
