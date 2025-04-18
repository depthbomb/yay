import './assets/css/index.css';
import { App } from './App.tsx';
import { Tooltip } from 'radix-ui';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('app')!).render(
	<StrictMode>
		<Tooltip.Provider delayDuration={0}>
			<App/>
		</Tooltip.Provider>
	</StrictMode>
);
