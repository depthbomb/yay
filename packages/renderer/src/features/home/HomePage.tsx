import clsx from 'clsx';
import Icon from '@mdi/react';
import { useAtom } from 'jotai';
import { mdiUpdate } from '@mdi/js';
import { useRef, useEffect } from 'react';
import { Button } from '~/components/Button';
import { TextInput } from '~/components/input';
import { useSetting, useKeyCombo } from '~/hooks';
import { logAtom, shiftLogAtom } from '~/atoms/log';
import { HomeFooter } from './components/HomeFooter';
import { SettingsKey, isValidHttpUrl } from 'shared';
import { DownloadButtons } from './components/DownloadButtons';
import { urlAtom, workingAtom, updatingAtom, isUrlValidAtom, updateAvailableAtom } from '~/atoms/app';
import type { FC, ChangeEvent } from 'react';

type LogLineProps = { line: string; };

const LogLine: FC<LogLineProps> = ({ line, ...props }) => {
	const css = clsx(
		'py-1 px-2 flex flex-row items-center text-[10px] font-mono even:bg-gray-900',
		{
			'text-sky-500': line.includes('[info]'),
			'text-yellow-500': line.includes('[download]'),
			'text-red-500 font-bold': line.startsWith('ERROR'),
			'text-brand-600': line.startsWith('OPERATION '),
		}
	);
	return (
		<p className={css} {...props}>
			<span>{line}</span>
		</p>
	);
};

export const HomePage = () => {
	const [url, setUrl]     = useAtom(urlAtom);
	const [isValidUrl]      = useAtom(isUrlValidAtom);
	const [isWorking]       = useAtom(workingAtom);
	const [isUpdating]      = useAtom(updatingAtom);
	const [logs]            = useAtom(logAtom);
	const [,shiftLog]       = useAtom(shiftLogAtom);
	const [updateAvailable] = useAtom(updateAvailableAtom);

	const mediaUrlEl  = useRef<HTMLInputElement>(null);
	const logOutputEl = useRef<HTMLDivElement>(null);

	const [showHintFooter] = useSetting(SettingsKey.ShowHintFooter, { defaultValue: true });

	const tryPasting = async () => {
		const text = await navigator.clipboard.readText();
		if (isValidHttpUrl(text)) {
			setUrl(text);
		}
	};
	const trySelectingInput = () => {
		mediaUrlEl.current?.focus();
		mediaUrlEl.current?.select();
	};
	const trySubmitting = async () => {
		if (!isValidUrl) {
			return;
		}

		await window.api.downloadDefault(url);
	};

	const onInputChange = (event: ChangeEvent<HTMLInputElement>) => setUrl(event.target.value.trim());

	useKeyCombo({ key: 'enter' }, trySubmitting);
	useKeyCombo({ key: 'v', ctrl: true }, tryPasting);
	useKeyCombo({ key: 'a', ctrl: true }, trySelectingInput);

	useEffect(() => {
		if (logs.length > 250) {
			shiftLog();
		}

		logOutputEl.current!.scrollTop = logOutputEl.current!.scrollHeight;
	}, [logs]);

	return (
		<div className="p-3 h-full flex flex-col space-y-4 overflow-hidden">
			<TextInput
				ref={mediaUrlEl}
				onChange={onInputChange}
				onContextMenu={() => window.api.showInputRightClickMenu()}
				value={url}
				placeholder="Media URL"
				disabled={isWorking || isUpdating}
				readOnly={isWorking || isUpdating}
			/>
			<DownloadButtons
				onDownloadVideoClick={() => window.api.downloadVideo(url)}
				onDownloadAudioClick={() => window.api.downloadAudio(url)}
				onCancelDownloadClick={() => window.api.cancelDownload()}
				working={isWorking}
				disabled={!isValidUrl || isUpdating}
			/>
			<div className="grow bg-black border border-gray-600 rounded overflow-hidden">
				<div ref={logOutputEl} className="h-full overflow-y-auto [scrollbar-width:thin]">
					{logs.map((line, i) => (
						<LogLine key={i} line={line}/>
					))}
				</div>
			</div>
			{updateAvailable ? (
				<Button onClick={() => window.api.showUpdaterWindow()} variant="info">
					<Icon path={mdiUpdate} className="size-3"/>
					<span>A new version of yay is available</span>
				</Button>
			) : (showHintFooter && <HomeFooter/>)}
		</div>
	);
};
