import { typedEntries } from 'shared';
import { lazy, useEffect } from 'react';
import { useIpc, useWindowsAccent } from './hooks';
import { HomePage } from './features/home/HomePage';
import { SetupPage } from './features/setup/SetupPage';
import { Route, Routes, HashRouter } from 'react-router';
import type { ColorPalette } from './hooks/use-windows-accent';

const SettingsPage   = lazy(() => import('./features/settings/SettingsPage'));
const UpdaterPage    = lazy(() => import('./features/updater/UpdaterPage'));
const GlobalMenuPage = lazy(() => import('./features/global-menu/GlobalMenuPage'));

export const App = () => {
	const [,onceShouldReload]                        = useIpc('window->should-reload');
	const { palette, getCSSColor, getContrastColor } = useWindowsAccent();

	useEffect(() => {
		onceShouldReload(() => window.location.reload());
	}, [onceShouldReload]);

	useEffect(() => {
		const root = document.documentElement;
		if (!palette) {
			return;
		}

		for (const [shade] of typedEntries<ColorPalette>(palette!)) {
			root.style.setProperty(`--accent-${shade}`, getCSSColor(shade));
			root.style.setProperty(`--accent-${shade}-contrast`, getContrastColor(shade));
		}
	}, [palette, getCSSColor, getContrastColor]);

	return (
		<HashRouter>
			<Routes>
				<Route index element={<HomePage/>}/>
				<Route path="settings" element={<SettingsPage/>}/>
				<Route path="updater" element={<UpdaterPage/>}/>
				<Route path="setup" element={<SetupPage/>}/>
				<Route path="global-menu" element={<GlobalMenuPage/>}/>
			</Routes>
		</HashRouter>
	)
};
