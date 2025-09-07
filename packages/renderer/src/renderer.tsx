import './assets/css/index.css';
import { Tooltip } from 'radix-ui';
import { lazy, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SetupPage } from './features/setup/SetupPage';
import { Route, Routes, HashRouter } from 'react-router';

const HomePage     = lazy(() => import('./features/home/HomePage'));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'));
const UpdaterPage  = lazy(() => import('./features/updater/UpdaterPage'));

createRoot(document.getElementById('app')!).render(
	<StrictMode>
		<HashRouter>
			<Tooltip.Provider delayDuration={0}>
				<Routes>
					<Route index element={<HomePage/>}/>
					<Route path="settings" element={<SettingsPage/>}/>
					<Route path="updater" element={<UpdaterPage/>}/>
					<Route path="setup" element={<SetupPage/>}/>
				</Routes>
			</Tooltip.Provider>
		</HashRouter>
	</StrictMode>
);
