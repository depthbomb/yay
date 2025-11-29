import { IpcService } from '~/services/ipc';
import { WindowService } from '~/services/window';
import { inject, injectable } from '@needle-di/core';
import { nativeTheme, systemPreferences } from 'electron';
import type { IBootstrappable } from '~/common';

@injectable()
export class ThemingService implements IBootstrappable {
	public constructor(
		private readonly ipc    = inject(IpcService),
		private readonly window = inject(WindowService),
	) {}

	public async bootstrap() {
		this.ipc.registerHandler('theming<-get-accent-color', () => {
			console.log(systemPreferences.getAccentColor());
			return systemPreferences.getAccentColor();
		});

		nativeTheme.on('updated', () => {
			this.window.emitAll('theming->accent-color-changed', {
				accentColor: systemPreferences.getAccentColor()
			});
		});
	}

	private getAccentColor() {
		return systemPreferences.getAccentColor();
	}
}
