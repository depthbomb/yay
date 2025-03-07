import Icon from '@mdi/react';
import { Fragment } from 'react';
import { Tooltip } from './Tooltip';
import type { FC } from 'react';

type KeyComboProps = {
	keys: Array<string | { iconPath: string; name: string; }>;
};

export const KeyCombo: FC<KeyComboProps> = ({ keys }) => {
	const transformKey = (key: string) => {
		key = key.toLocaleLowerCase();
		key = key.replace('ctrl', '^');
		key = key.replace('cmd', '⌘');
		key = key.replace('shift', '⇧');
		key = key.replace('tab', '↹');
		key = key.replace('alt', '⌥');
		key = key.replace('enter', '↵');
		key = key.replace('backspace', '⌫');
		key = key.replace('delete', 'Del');

		return key;
	};

	return (
		<Tooltip content={keys.map(k => typeof k === 'string' ? k : k.name).join('+').toUpperCase()}>
			<kbd className="relative inline-flex py-0.5 px-1.5 min-w-[1rem] min-h-[1rem] text-gray-100 text-xs text-center font-mono uppercase bg-gray-600 popup-gray-800 rounded-sm cursor-default translate-y-2px active:text-gray-300 active:popup-depressed-gray-800 active:translate-y-[2px] transition-all duration-100">
				{keys.map((key, index) => (
					<Fragment key={index}>
						{index > 0 && <span className="mx-1">+</span>}
						<span>
							{typeof key === 'string' ? (
								transformKey(key)
							) : (
								<Icon path={key.iconPath} className="inline size-4 -translate-y-[1px]"/>
							)}
						</span>
					</Fragment>
				))}
			</kbd>
		</Tooltip>
	);
};
