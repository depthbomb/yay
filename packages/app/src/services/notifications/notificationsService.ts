import { Notification } from 'electron';
import { injectable } from '@needle-di/core';
import type { NotificationBuilder } from './notificationBuilder';

@injectable()
export class NotificationsService {
	public showNotification(builder: NotificationBuilder) {
		const toastXml = builder.build();
		new Notification({ toastXml }).show();
	}
}
