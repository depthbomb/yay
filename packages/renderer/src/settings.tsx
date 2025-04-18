import './assets/css/index.css';
import { Tooltip } from 'radix-ui';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SettingsPage } from './features/settings/SettingsPage';

createRoot(document.getElementById('app')!).render(
	<StrictMode>
		<Tooltip.Provider delayDuration={0}>
			<SettingsPage/>
		</Tooltip.Provider>
	</StrictMode>
);
