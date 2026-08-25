import { useSetAtom } from 'jotai';
import { lazy, useEffect } from 'react';
import { useWindowsAccent } from './hooks';
import { settingsAtom } from './atoms/settings';
import { HomePage } from './features/home/HomePage';
import { SetupPage } from './features/setup/SetupPage';
import { Route, Routes, HashRouter } from 'react-router';

const SettingsPage   = lazy(() => import('./features/settings/SettingsPage'));
const UpdaterPage    = lazy(() => import('./features/updater/UpdaterPage'));
const GlobalMenuPage = lazy(() => import('./features/global-menu/GlobalMenuPage'));

export const App = () => {
	useWindowsAccent();
	const setSettings = useSetAtom(settingsAtom);

	useEffect(() => {
		window.ipc.invoke('settings<-get-all').then(result => {
			if (result.isOk) {
				setSettings(result.data);
			}
		});
	}, [setSettings]);

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
