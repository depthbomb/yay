import './assets/css/index.css';
import { StrictMode } from 'react';
import { SetupApp } from './SetupApp';
import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('app')!).render(
	<StrictMode>
		<SetupApp/>
	</StrictMode>
);
