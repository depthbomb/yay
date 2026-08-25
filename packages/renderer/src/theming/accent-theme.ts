export const paletteShades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

export type PaletteShade = typeof paletteShades[number];

export type RGBColor = {
	r: number;
	g: number;
	b: number;
};

export type AccentTheme = Record<PaletteShade, {
	color: string;
	contrast: '#ffffff' | '#000000';
}>;

const mixes = {
	50:  { target: 255, amount: 0.90 },
	100: { target: 255, amount: 0.80 },
	200: { target: 255, amount: 0.60 },
	300: { target: 255, amount: 0.40 },
	400: { target: 255, amount: 0.20 },
	500: { target: 0,   amount: 0 },
	600: { target: 0,   amount: 0.20 },
	700: { target: 0,   amount: 0.40 },
	800: { target: 0,   amount: 0.60 },
	900: { target: 0,   amount: 0.75 },
	950: { target: 0,   amount: 0.85 }
} as const satisfies Record<PaletteShade, { target: 0 | 255; amount: number }>;

function parseAccentColor(color: string): RGBColor | null {
	const match = /^(?:#)?([\da-f]{6})(?:[\da-f]{2})?$/i.exec(color);
	if (!match?.[1]) {
		return null;
	}

	return {
		r: Number.parseInt(match[1].slice(0, 2), 16),
		g: Number.parseInt(match[1].slice(2, 4), 16),
		b: Number.parseInt(match[1].slice(4, 6), 16)
	};
}

function mixChannel(channel: number, target: 0 | 255, amount: number) {
	return Math.round(channel + (target - channel) * amount);
}

function getRelativeLuminance({ r, g, b }: RGBColor) {
	const linearize = (channel: number) => {
		const srgb = channel / 255;
		return srgb <= 0.04045
			? srgb / 12.92
			: ((srgb + 0.055) / 1.055) ** 2.4;
	};

	return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function getContrastColor(color: RGBColor): '#ffffff' | '#000000' {
	return getRelativeLuminance(color) > 0.179 ? '#000000' : '#ffffff';
}

export function createAccentTheme(accentColor: string): AccentTheme | null {
	const base = parseAccentColor(accentColor);
	if (!base) {
		return null;
	}

	return Object.fromEntries(paletteShades.map(shade => {
		const { target, amount } = mixes[shade];
		const color = {
			r: mixChannel(base.r, target, amount),
			g: mixChannel(base.g, target, amount),
			b: mixChannel(base.b, target, amount)
		};

		return [shade, {
			color: `rgb(${color.r}, ${color.g}, ${color.b})`,
			contrast: getContrastColor(color)
		}];
	})) as AccentTheme;
}
