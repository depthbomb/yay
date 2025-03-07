export type Events = {
	'setup-finished': void;
	'settings-updated': { key: string, value: unknown };
	'download-started': string;
	'download-finished': void;
};
