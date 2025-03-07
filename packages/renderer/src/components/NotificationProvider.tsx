import { useEffect } from 'react';
import { useIpc, useSetting } from '~/hooks';
import { IpcChannel, SettingsKey } from 'shared';
import type { FC } from 'react';

import notification1 from '~/assets/audio/notification1.mp3';
import notification2 from '~/assets/audio/notification2.mp3';
import notification3 from '~/assets/audio/notification3.mp3';

const getNotificationSrcFromId = (id: number) => {
	switch (id) {
		default:
		case 1:
			return notification1;
		case 2:
			return notification2;
		case 3:
			return notification3;
	}
};

export const NotificationProvider: FC = () => {
	const [notificationId]          = useSetting(SettingsKey.NotificationSoundId, { defaultValue: 1 });
	const [onPlayNotificationSound] = useIpc(IpcChannel.PlayNotificationSound);

	useEffect(() => {
		if (notificationId === 0) {
			return;
		}

		const audio   = new Audio(getNotificationSrcFromId(notificationId));
		audio.volume  = 0.5;
		audio.preload = 'auto';

		const remove = onPlayNotificationSound(() => audio.play());

		return () => remove();
	}, [notificationId]);

	return null;
};
