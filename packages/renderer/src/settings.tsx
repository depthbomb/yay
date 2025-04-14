import './assets/css/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SettingsPage } from './features/settings/SettingsPage';

createRoot(document.getElementById('app')!).render(
	<StrictMode>
		<SettingsPage/>
	</StrictMode>
);
