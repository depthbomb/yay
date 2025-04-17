import { Octokit } from 'octokit';
import { injectable } from '@needle-di/core';

@injectable()
export class GithubService {
	private readonly octokit: Octokit;

	public constructor() {
		if (import.meta.env.DEV) {
			this.octokit = new Octokit({ auth: __GITHUB_ACCESS_TOKEN__ });
		} else {
			this.octokit = new Octokit();
		}
	}

	public async getLatestRepositoryRelease(username: string, repository: string, prerelease: boolean = false) {
		const releases = await this.getRepositoryReleases(username, repository);

		return releases.find(r => r.prerelease === prerelease);
	}

	public async getRepositoryReleases(owner: string, repo: string) {
		const { data } = await this.octokit.rest.repos.listReleases({ owner, repo });

		return data;
	}

	public async getRepositoryCommits(owner: string, repo: string, sha?: string) {
		const { data } = await this.octokit.rest.repos.listCommits({ owner, repo });

		if (sha) {
			const idx = data.findIndex(c => c.sha.startsWith(sha));
			if (idx === -1) {
				return [];
			}

			return data.slice(0, idx);
		}

		return data;
	}
}
