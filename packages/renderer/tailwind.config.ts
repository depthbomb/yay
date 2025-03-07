import plugin from 'tailwindcss/plugin';
import colors from 'tailwindcss/colors';
import type { Config } from 'tailwindcss';

export default {
	content: [
		'./src/index.html',
		'./src/setup.html',
		'./src/**/*.{js,ts,jsx,tsx}',
	],
	plugins: [
		plugin(({ addComponents }) => {
			addComponents({
				'.draggable': {
					'-webkit-app-region': 'drag',
				},
				'.not-draggable': {
					'-webkit-app-region': 'none',
				}
			});
		})
	],
	theme: {
		extend: {
			colors: {
				sky: colors.sky,
				lime: colors.lime,
				yellow: colors.yellow,
				orange: colors.orange,
				red: colors.red,
				gray: colors.zinc,
				brand: {
					50: '#fef1f8',
					100: '#fee5f3',
					200: '#ffcae9',
					300: '#ff9fd4',
					400: '#ff63b6',
					500: '#ff2790',
					600: '#f01273',
					700: '#d10558',
					800: '#ad0749',
					900: '#8f0c40',
					950: '#580021',
				},
				'brand-red': {
					50: '#ffe5eb',
					100: '#ffccd6',
					200: '#ff99ad',
					300: '#ff6685',
					400: '#ff335c',
					500: '#ff0033',
					600: '#cc0029',
					700: '#99001f',
					800: '#660014',
					900: '#33000a',
					950: '#190005',
				}
			},
			fontFamily: {
				sans: [
					'"Noto Sans Variable"'
				],
				mono: [
					'"Noto Sans Mono Variable"'
				],
			}
		},
	}
} satisfies Config;
