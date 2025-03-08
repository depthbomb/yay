import './assets/css/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SetupPage } from './features/setup/SetupPage';

createRoot(document.getElementById('app')!).render(
	<StrictMode>
		<SetupPage/>
	</StrictMode>
);
