import { useEffect } from 'react';
import { createAccentTheme, paletteShades } from '../theming/accent-theme';

let appliedAccentColor: string | null = null;

function applyAccentTheme(accentColor: string) {
	if (accentColor === appliedAccentColor) {
		return;
	}

	const theme = createAccentTheme(accentColor);
	if (!theme) {
		return;
	}

	const root = document.documentElement;
	for (const shade of paletteShades) {
		root.style.setProperty(`--accent-${shade}`, theme[shade].color);
		root.style.setProperty(`--accent-${shade}-contrast`, theme[shade].contrast);
	}

	appliedAccentColor = accentColor;
}

export function useWindowsAccent() {
	useEffect(() => {
		let disposed = false;
		let receivedChange = false;

		const removeListener = window.ipc.on('theming->accent-color-changed', ({ accentColor }) => {
			receivedChange = true;
			applyAccentTheme(accentColor);
		});

		void window.ipc.invoke('theming<-get-accent-color').then(result => {
			if (!disposed && !receivedChange && result.isOk) {
				applyAccentTheme(result.data);
			}
		});

		return () => {
			disposed = true;
			removeListener();
		};
	}, []);
}
