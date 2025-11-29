import { useState, useEffect } from 'react';

type ModifierKey = 'Alt' | 'Control' | 'Meta' | 'Shift';

const keyMap: Record<ModifierKey, keyof KeyboardEvent> = {
	Alt: 'altKey',
	Control: 'ctrlKey',
	Meta: 'metaKey',
	Shift: 'shiftKey',
};

export const useModifierKey = (key: ModifierKey) => {
	const [pressed, setPressed] = useState(false);

	useEffect(() => {
		const prop   = keyMap[key];
		const update = (event: KeyboardEvent) => {
			const next = Boolean(event[prop]);
			setPressed(prev => (prev !== next ? next : prev));
		};

		window.addEventListener('keydown', update);
		window.addEventListener('keyup', update);

		return () => {
			window.removeEventListener('keydown', update);
			window.removeEventListener('keyup', update);
		};
	}, [key]);

	return pressed;
};
