import { USER_AGENT } from '~/constants';
import { endpoint } from '@octokit/endpoint';
import type { Release } from './types';
import type { HttpClient, HttpClientManager } from '~/lib/HttpClientManager';

export class Github {
	private readonly http: HttpClient;

	public constructor(
		private readonly httpClientManager: HttpClientManager
	) {
		this.http = this.httpClientManager.getClient('GitHub', { userAgent: USER_AGENT });
	}

	public async getLatestRepositoryRelease(username: string, repository: string, prerelease: boolean = false) {
		const releases = await this.getRepositoryReleases(username, repository);

		return releases.find(r => r.prerelease === prerelease);
	}

	public async getRepositoryReleases(owner: string, repo: string) {
		let url: string;
		let options: object;
		if (import.meta.env.DEV) {
			({ url, ...options } = endpoint('GET /repos/{owner}/{repo}/releases', {
				headers: {
					authorization: `token ${__GITHUB_ACCESS_TOKEN__}`
				},
				owner,
				repo
			}));
		} else {
			({ url, ...options } = endpoint('GET /repos/{owner}/{repo}/releases', { owner, repo }));
		}

		const res = await this.http.send(url, options);
		if (!res.ok) {
			throw new Error(res.statusText);
		}

		const data = await res.json() as Release[];

		return data;
	}
}
