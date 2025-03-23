import { Notification } from 'electron';
import { NotificationBuilder } from './notificationBuilder';

export class Notifications {
	public showNotification(builder: NotificationBuilder) {
		const toastXml = builder.build();
		new Notification({ toastXml }).show();
	}
}
