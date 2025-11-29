import './assets/css/index.css';
import { App } from './App';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('app')!).render(
	<StrictMode>
		<App/>
	</StrictMode>
);
