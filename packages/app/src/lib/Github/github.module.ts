import { Github } from './github';
import type { Container } from '~/lib/Container';

export class GithubModule {
	public static async bootstrap(container: Container) {
		container.register('Github', new Github(container.get('HttpClientManager')));
	}
}
