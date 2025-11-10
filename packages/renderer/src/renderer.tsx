import './assets/css/index.css';
import { lazy, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Snowfall from '~/components/effects/Snowfall';
import { SetupPage } from './features/setup/SetupPage';
import { Route, Routes, HashRouter } from 'react-router';

const HomePage     = lazy(() => import('./features/home/HomePage'));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'));
const UpdaterPage  = lazy(() => import('./features/updater/UpdaterPage'));

const isSnowfall = () => {
	const date  = new Date();
	const month = date.getMonth();

	return month === 11 || month === 0;
};

createRoot(document.getElementById('app')!).render(
	<StrictMode>
		{isSnowfall() && <Snowfall/>}
		<HashRouter>
			<Routes>
				<Route index element={<HomePage/>}/>
				<Route path="settings" element={<SettingsPage/>}/>
				<Route path="updater" element={<UpdaterPage/>}/>
				<Route path="setup" element={<SetupPage/>}/>
			</Routes>
		</HashRouter>
	</StrictMode>
);
