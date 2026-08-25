export const toTaskbarProgress = (percentage: number) =>
	Number.isFinite(percentage) ? Math.min(100, Math.max(0, percentage)) / 100 : 0;
