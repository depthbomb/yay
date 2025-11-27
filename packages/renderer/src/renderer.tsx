import './assets/css/index.css';
import { lazy, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SetupPage } from './features/setup/SetupPage';
import { Route, Routes, HashRouter } from 'react-router';

const HomePage       = lazy(() => import('./features/home/HomePage'));
const SettingsPage   = lazy(() => import('./features/settings/SettingsPage'));
const UpdaterPage    = lazy(() => import('./features/updater/UpdaterPage'));
const GlobalMenuPage = lazy(() => import('./features/global-menu/GlobalMenuPage'));

createRoot(document.getElementById('app')!).render(
	<StrictMode>
		<HashRouter>
			<Routes>
				<Route index element={<HomePage/>}/>
				<Route path="settings" element={<SettingsPage/>}/>
				<Route path="updater" element={<UpdaterPage/>}/>
				<Route path="setup" element={<SetupPage/>}/>
				<Route path="global-menu" element={<GlobalMenuPage/>}/>
			</Routes>
		</HashRouter>
	</StrictMode>
);
