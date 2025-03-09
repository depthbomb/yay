import Icon from '@mdi/react';
import { Button } from './Button';
import { useState, useEffect } from 'react';
import { mdiCheck, mdiClose, mdiMinus } from '@mdi/js';
import type { FC, ButtonHTMLAttributes } from 'react';

type ToggleButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
	enabled: boolean;
};

export const ToggleButton: FC<ToggleButtonProps> = ({ enabled, onClick, ...props }) => {
	const [isInitial, setIsInitial] = useState(true);

	useEffect(() => setIsInitial(false), []);

	return (
		<Button onClick={onClick} variant={enabled ? 'success' : 'danger'} {...props}>
			<Icon path={isInitial ? mdiMinus : enabled ? mdiCheck : mdiClose} className="size-4"/>
			<span>{ isInitial ? '...' : enabled ? 'Enabled' : 'Disabled' }</span>
		</Button>
	);
};
