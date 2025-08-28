import { net } from 'electron';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';

@injectable()
export class OnlineChecker {
	public constructor(
		private readonly logger = inject(LoggingService)
	) {}

	public async checkIfOnline() {
		this.logger.info('Checking online status');

		const tasks = [
			this.checkIfOnlineViaNetModule(),
			this.checkIfOnlineViaProbe(),
		];

		const res = await Promise.all(tasks);

		return res.every(r => r === true);
	}

	private async checkIfOnlineViaProbe() {
		// As per the Electron documenation, `net.isOnline()` isn't a foolproof way to tell if the
		// user is online. This check adds an extra layer of validation.
		try {
			await net.fetch('https://youtube.com/generate_204');

			return true;
		} catch {
			return false;
		}
	}

	private async checkIfOnlineViaNetModule() {
		return net.isOnline();
	}
}
