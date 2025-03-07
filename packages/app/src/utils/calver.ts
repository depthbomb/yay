export function parseCalVer (version: string): number[] {
	const parts = version.split('.');

	if (parts.length < 2 || parts.length > 3) {
		throw new Error(`Invalid CalVer format: ${version}`);
	}

	let year = parseInt(parts[0]);
	if (year < 100) {
		year += 2000;
	}

	const month = parseInt(parts[1]);
	if (month < 1 || month > 12) {
		throw new Error(`Invalid month in CalVer: ${version}`);
	}

	const day = parts.length === 3 ? parseInt(parts[2]) : 1;
	if (day < 1 || day > 31) {
		throw new Error(`Invalid day in CalVer: ${version}`);
	}

	return [year, month, day];
};
