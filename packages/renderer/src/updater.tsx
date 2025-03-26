import './assets/css/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { UpdaterPage } from './features/updater/UpdaterPage';

createRoot(document.getElementById('app')!).render(
	<StrictMode>
		<UpdaterPage/>
	</StrictMode>
);
