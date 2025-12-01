import Icon from '@mdi/react';
import { Fragment } from 'react';
import { TooltipV2 } from './TooltipV2';
import type { FC } from 'react';

export interface IKeyComboProps {
	keys: Array<string | { iconPath: string; name: string; }>;
}

export const KeyCombo: FC<IKeyComboProps> = ({ keys }) => {
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
		<TooltipV2 content={keys.map(k => typeof k === 'string' ? k : k.name).join('+').toUpperCase()}>
			<kbd className="relative inline-flex py-0.5 px-1.75 text-accent-200-contrast text-xs font-mono uppercase bg-accent-200 rounded-xs">
				{keys.map((key, index) => (
					<Fragment key={index}>
						{index > 0 && <span className="mx-1">+</span>}
						<span>
							{typeof key === 'string' ? (
								transformKey(key)
							) : (
								<Icon path={key.iconPath} className="inline size-4 -translate-y-px"/>
							)}
						</span>
					</Fragment>
				))}
			</kbd>
		</TooltipV2>
	);
};
