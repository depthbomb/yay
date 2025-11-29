import { useState, useEffect } from 'react';
import type { Nullable } from 'shared';

export type RGBColor = {
	r: number;
	g: number;
	b: number;
};

export type PaletteShade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;

export type ColorPalette = Record<PaletteShade, RGBColor>;

function hexToRgb(hex: string): RGBColor {
	const r = parseInt(hex.substring(0, 2), 16);
	const g = parseInt(hex.substring(2, 4), 16);
	const b = parseInt(hex.substring(4, 6), 16);

	return { r, g, b };
}

function generatePalette(baseColor: string) {
	const { r, g, b } = hexToRgb(baseColor);

	const lighten = (color: RGBColor, amount: number) => {
		return {
			r: Math.round(color.r + (255 - color.r) * amount),
			g: Math.round(color.g + (255 - color.g) * amount),
			b: Math.round(color.b + (255 - color.b) * amount)
		};
	};

	const darken = (color: RGBColor, amount: number) => {
		return {
			r: Math.round(color.r * (1 - amount)),
			g: Math.round(color.g * (1 - amount)),
			b: Math.round(color.b * (1 - amount))
		};
	};

	const base = { r, g, b } as const;

	return {
		50: lighten(base, 0.90),
		100: lighten(base, 0.80),
		200: lighten(base, 0.60),
		300: lighten(base, 0.40),
		400: lighten(base, 0.20),
		500: base,
		600: darken(base, 0.20),
		700: darken(base, 0.40),
		800: darken(base, 0.60),
		900: darken(base, 0.75),
		950: darken(base, 0.85)
	};
}

function getRelativeLuminance(color: RGBColor) {
	const rsRGB = color.r / 255;
	const gsRGB = color.g / 255;
	const bsRGB = color.b / 255;

	const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
	const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
	const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getContrastColor(backgroundColor: RGBColor): '#ffffff' | '#000000' {
	const luminance = getRelativeLuminance(backgroundColor);
	return luminance > 0.5 ? '#000000' : '#ffffff';
}

export function useWindowsAccent() {
	const [accentColor, setAccentColor]       = useState<Nullable<string>>(null);
	const [palette, setPalette]               = useState<Nullable<ColorPalette>>(null);
	const [contrastColors, setContrastColors] = useState<Nullable<Record<PaletteShade, '#ffffff' | '#000000'>>>(null);

	useEffect(() => {
		window.ipc.invoke('theming<-get-accent-color').then(color => {
			setAccentColor(color);
			const newPalette = generatePalette(color);
			setPalette(newPalette);

			const contrasts = Object.fromEntries(
				Object.entries(newPalette).map(([shade, rgb]) => [
					shade,
					getContrastColor(rgb)
				])
			) as Record<PaletteShade, '#ffffff' | '#000000'>;

			setContrastColors(contrasts);
		});

		const removeListener = window.ipc.on('theming->accent-color-changed', ({ accentColor }) => {
			setAccentColor(accentColor);
			const newPalette = generatePalette(accentColor);
			setPalette(newPalette);

			const contrasts = Object.fromEntries(
				Object.entries(newPalette).map(([shade, rgb]) => [
					shade,
					getContrastColor(rgb)
				])
			) as Record<PaletteShade, '#ffffff' | '#000000'>;

			setContrastColors(contrasts);
		});

		return () => {
			removeListener();
		}
	}, []);

	const getCssColor = (shade: PaletteShade = 500) => {
		if (!palette) {
			return null;
		}

		const { r, g, b } = palette[shade];
		return `rgb(${r}, ${g}, ${b})`;
	};

	const getContrastColorForShade = (shade: PaletteShade = 500) => {
		if (!contrastColors) {
			return null;
		}

		return contrastColors[shade];
	};

	return {
		accentColor,
		palette,
		contrastColors,
		getCssColor,
		getContrastColor: getContrastColorForShade
	} as const;
}
