import { Notification } from 'electron';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import type { NotificationBuilder } from './notificationBuilder';

@injectable()
export class NotificationsService {
	public constructor(
		private readonly logger = inject(LoggingService),
	) {}

	public showNotification(builder: NotificationBuilder) {
		const toastXml = builder.build();

		this.logger.debug('Showing toast notification', { toastXml });

		new Notification({ toastXml }).show();
	}
}
