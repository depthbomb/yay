import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';

const distDir = resolve('./packages/app/dist');

if (existsSync(distDir)) {
	rm(distDir, { recursive: true })
		.then(() => console.log('Cleaned dist directory'))
		.catch((err: unknown) => console.error(err));
}
