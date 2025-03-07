import Icon from '@mdi/react';
import { useAtom } from 'jotai';
import { useEffect, useState } from 'react';
import { windowPinnedAtom } from '~/atoms/app';
import { KeyCombo } from '~/components/KeyCombo';
import { IconButton } from '~/components/IconButton';
import { mdiPin, mdiPinOff, mdiCreation } from '@mdi/js';
import type { JSX } from 'react';
import type { Maybe } from 'shared';

const hints = [
	<span className="text-xs">Press <KeyCombo keys={['ctrl', 'v']}/> with the menu open to paste a valid URL!</span>,
	<span className="text-xs">Press <KeyCombo keys={['enter']}/> after pasting to start the download!</span>,
	<span className="text-xs"><strong>yay</strong> can download from <a href="https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md#supported-sites" target="_blank">many sites</a>, not just YouTube!</span>,
] as const;

export const HomeFooter = () => {
	const [isWindowPinned, setWindowPinned] = useAtom(windowPinnedAtom);
	const [hint, setHint]                   = useState<Maybe<JSX.Element>>();

	const displayRandomHint = () => {
		const availableHints = hints.filter(h => h !== hint);
		setHint(availableHints[Math.floor(Math.random() * availableHints.length)]);
	};

	const onPinWindowButtonClicked = async () => {
		setWindowPinned(
			await window.api.toggleWindowPinned()
		);
	};

	useEffect(() => {
		displayRandomHint();
		const hintInterval = setInterval(displayRandomHint, 15_000);

		return () => clearInterval(hintInterval);
	}, []);

	return (
		<footer className="flex flex-row items-center text-gray-300">
			<Icon path={mdiCreation} className="size-4 shrink-0 text-yellow-500"/>
			<p className="ml-1 w-full flex items-center">{hint}</p>
			<IconButton
				icon={isWindowPinned ? mdiPinOff : mdiPin}
				title={isWindowPinned ? 'Unpin menu' : 'Pin menu'}
				tooltipPosition="left"
				onClick={onPinWindowButtonClicked}/>
		</footer>
	);
};
