import { marked } from 'marked';
import { injectable } from '@needle-di/core';

@injectable()
export class MarkdownService {
	public constructor() {
		marked.use({
			renderer: {
				list({ items }) {
					return `
						<ul style="padding-left:1.5rem;list-style:revert;">
							${items.map(li => `<li>${this.parser.parse(li.tokens)}</li>`).join('')}
						</ul>
					`;
				},
				link({ href, text }) {
					return `<a href="${href}" target="_blank" style="color:#ff2790;">${text}</a>`;
				},
			}
		});
	}

	public async parse(markdown: string) {
		return marked.parse(markdown);
	}
}
