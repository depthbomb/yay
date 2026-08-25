export const parseUpdateOutput = (output: string) => ({
	version: output.match(/\b(?:stable@)?\d{4}\.\d{2}\.\d{2}(?:\.\d+)?\b/i)?.[0] ?? 'unknown version',
	updated: /\b(?:updating to|updated yt-dlp)\b/i.test(output),
});
