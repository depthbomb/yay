import { USER_AGENT } from '~/constants';
import { HTTPService } from '~/services/http';
import { inject, injectable } from '@needle-di/core';
import type { HTTPClient } from '~/services/http';
import type { GitHubCommit, GitHubRelease } from 'shared';

@injectable()
export class GithubService {
	private readonly client: HTTPClient;
	private readonly token: string;

	public constructor(
		private readonly http = inject(HTTPService),
	) {
		this.client = this.http.getClient(GithubService.name, {
			baseURL: 'https://api.github.com',
			userAgent: USER_AGENT,
			retry: true
		});
		this.token = import.meta.env.DEV ? __GITHUB_ACCESS_TOKEN__.trim() : '';
	}

	public async getLatestRepositoryRelease(owner: string, repo: string, prerelease: boolean = false) {
		const releases = await this.getRepositoryReleases(owner, repo);

		return releases.find(r => r.prerelease === prerelease);
	}

	public async getRepositoryReleases(owner: string, repo: string) {
		const path = `repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases`;
		return this.getJSON<GitHubRelease[]>(path, {
			accept: 'application/vnd.github.html+json'
		});
	}

	public async getRepositoryCommits(owner: string, repo: string, sha?: string) {
		const path = `repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits`;
		const data = await this.getJSON<GitHubCommit[]>(path, {
			query: { per_page: 100 }
		});

		if (sha) {
			const idx = data.findIndex(c => c.sha.startsWith(sha));
			if (idx === -1) {
				return [];
			}

			return data.slice(0, idx);
		}

		return data;
	}

	private async getJSON<T>(
		path: string,
		options?: {
			accept?: string;
			query?: Record<string, string | number>;
		}
	) {
		const res = await this.client.get(path, {
			query: options?.query,
			headers: {
				accept: options?.accept ?? 'application/vnd.github+json',
				'x-github-api-version': '2022-11-28',
				...this.getAuthHeader(),
			},
		});
		if (!res.ok) {
			throw new Error(`GitHub API request failed (${res.status} ${res.statusText})`);
		}

		return await res.json() as T;
	}

	private getAuthHeader() {
		if (this.token.length === 0) {
			return {};
		}

		return {
			authorization: `Bearer ${this.token}`,
		};
	}
}
