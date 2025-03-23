import { Notifications } from './notifications';
import type { ModuleRegistry } from '~/lib/ModuleRegistry';

export class NotificationsModule {
	public static bootstrap(moduleRegistry: ModuleRegistry) {
		moduleRegistry.register('Notifications', new Notifications());
	}
}
