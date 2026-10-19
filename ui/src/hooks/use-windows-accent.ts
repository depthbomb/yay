import { native } from '~/native';
import { useEffect } from 'react';
import { EventChannel, RequestChannel } from '~/ipc/ipc.generated';
import { paletteShades, createAccentTheme } from '~/theming/accent-theme';

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

		const removeListener = native.ipc.on(EventChannel.ThemingAccentColorChanged, ({ accentColor }) => {
			receivedChange = true;
			applyAccentTheme(accentColor);
		});

		void native.ipc.invoke(RequestChannel.ThemingGetAccentColor).then(result => {
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
