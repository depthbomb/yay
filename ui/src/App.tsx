import { native } from '~/native';
import { useSetAtom } from 'jotai';
import { lazy, useEffect } from 'react';
import { useWindowsAccent } from './hooks';
import { settingsAtom } from './atoms/settings';
import { HomePage } from './features/home/HomePage';
import { RequestChannel } from './ipc/ipc.generated';
import { SetupPage } from './features/setup/SetupPage';
import { Route, Routes, HashRouter } from 'react-router';

const SettingsPage   = lazy(() => import('./features/settings/SettingsPage'));
const UpdaterPage    = lazy(() => import('./features/updater/UpdaterPage'));
const GlobalMenuPage = lazy(() => import('./features/global-menu/GlobalMenuPage'));

const NativeReady = () => {
	useEffect(() => {
		void native.ipc.invoke(RequestChannel.NativeReady);
	}, []);

	return null;
};

export const App = () => {
	useWindowsAccent();
	const setSettings = useSetAtom(settingsAtom);

	useEffect(() => {
		native.ipc.invoke(RequestChannel.SettingsGetAll).then(result => {
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
			<NativeReady/>
		</HashRouter>
	)
};
