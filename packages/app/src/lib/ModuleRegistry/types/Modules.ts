import type { Emitter } from 'mitt';
import type { Ipc } from '~/lib/Ipc';
import type { Flags } from '~/lib/Cli';
import type { typeFlag } from 'type-flag';
import type { Github } from '~/lib/Github';
import type { AutoStart } from '~/lib/AutoStart';
import type { ThemeManager } from '~/lib/ThemeManager';
import type { YtdlpManager } from '~/lib/YtdlpManager';
import type { WindowManager } from '~/lib/WindowManager';
import type { Notifications } from '~/lib/Notifications';
import type { EventSubscriber } from '~/lib/EventSubscriber';
import type { SettingsManager } from '~/lib/SettingsManager';
import type { WindowPositioner } from '~/lib/WindowPositioner';
import type { Events, EventEmitter } from '~/lib/EventEmitter';
import type { HttpClientManager } from '~/lib/HttpClientManager';

export type Modules = {
	Args: ReturnType<typeof typeFlag>;
	Flags: Flags;
	AutoStart: AutoStart;
	Emitter: Emitter<Events>;
	EventEmitter: EventEmitter;
	EventSubscriber: EventSubscriber;
	Github: Github;
	HttpClientManager: HttpClientManager;
	Ipc: Ipc;
	Notifications: Notifications;
	SettingsManager: SettingsManager;
	ThemeManager: ThemeManager;
	WindowManager: WindowManager;
	WindowPositioner: WindowPositioner;
	YtdlpManager: YtdlpManager;
}
