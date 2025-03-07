import './assets/css/index.css';
import { App } from './App.tsx';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { NotificationProvider } from './components/NotificationProvider';

createRoot(document.getElementById('app')!).render(
	<StrictMode>
		<App/>
		<NotificationProvider/>
	</StrictMode>
);
