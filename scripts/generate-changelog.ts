import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import changelog from '../static/changelog.json';

const changelogFile = resolve('CHANGELOG.md');

type ChangeItem = string | ChangeItem[];

function convertToMarkdown(): string {
	return changelog.map((entry, index) => {
		const lines = [`# ${entry.version}`, ''];

		if (entry.description) {
			lines.push(entry.description, '');
		}

		lines.push(...formatChanges(entry.changes));
		lines.push('');

		if (index < changelog.length - 1) {
			lines.push('---', '');
		}

		return lines.join('\n');
	}).join('\n');
}

function formatChanges(changes: ChangeItem[], depth: number = 0): string[] {
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

writeFileSync(changelogFile, convertToMarkdown(), 'utf8');
