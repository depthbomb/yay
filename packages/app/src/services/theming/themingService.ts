import { ok } from 'shared/ipc';
import { IPCService } from '~/services/ipc';
import { WindowService } from '~/services/window';
import { inject, injectable } from '@needle-di/core';
import { systemPreferences } from 'electron';
import type { IBootstrappable } from '~/common';

@injectable()
export class ThemingService implements IBootstrappable {
	private accentColor = '';

	public constructor(
		private readonly ipc    = inject(IPCService),
		private readonly window = inject(WindowService),
	) {}

	public async bootstrap() {
		this.accentColor = systemPreferences.getAccentColor();
		this.ipc.registerHandler('theming<-get-accent-color', () => ok(this.accentColor));

		systemPreferences.on('accent-color-changed', (_event, accentColor) => {
			if (accentColor === this.accentColor) {
				return;
			}

			this.accentColor = accentColor;
			this.window.emitAll('theming->accent-color-changed', {
				accentColor
			});
		});
	}
}
