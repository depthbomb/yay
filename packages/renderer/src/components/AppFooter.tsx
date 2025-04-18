import Icon from '@mdi/react';
import { Anchor } from './Anchor';
import { mdiCreation } from '@mdi/js';
import { useEffect, useState } from 'react';
import { KeyCombo } from '~/components/KeyCombo';
import type { JSX } from 'react';
import type { Maybe } from 'shared';

const hints = [
	<span className="text-xs">Press <KeyCombo keys={['ctrl', 'v']}/> with the menu open to paste a valid URL!</span>,
	<span className="text-xs">Press <KeyCombo keys={['enter']}/> after pasting to start the download!</span>,
	<span className="text-xs"><strong>yay</strong> can download from <Anchor href="https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md#supported-sites" target="_blank">many sites</Anchor>, not just YouTube!</span>,
] as const;

export const AppFooter = () => {
	const [hint, setHint] = useState<Maybe<JSX.Element>>();

	const displayRandomHint = () => {
		const availableHints = hints.filter(h => h !== hint);
		setHint(availableHints[Math.floor(Math.random() * availableHints.length)]);
	};

	useEffect(() => {
		displayRandomHint();
		const hintInterval = setInterval(displayRandomHint, 15_000);

		return () => clearInterval(hintInterval);
	}, []);

	return (
		<footer className="space-x-2 pb-3 h-7 flex items-center justify-center shrink-0 text-gray-300">
			<Icon path={mdiCreation} className="size-4 shrink-0 text-yellow-500"/>
			<p className="flex items-center">{hint}</p>
		</footer>
	);
};
