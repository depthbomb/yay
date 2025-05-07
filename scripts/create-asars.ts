import { join } from 'node:path';
import { createPackage } from '@electron/asar';

const directories = [
	'notifications',
	'tray'
];

for (const dir of directories) {
	const src  = `static/extra/${dir}/`;
	const dest = `static/extra/${dir}.asar`;

	createPackage(src, dest).then(() => console.log('created asar', dest, 'from', src)).catch(console.error);
}
