import { useRef, useEffect, useCallback } from 'react';

type KeyCombo = {
	key: string;
	ctrl?: boolean;
	shift?: boolean;
	alt?: boolean;
	meta?: boolean;
};

type KeyComboHandler = () => void;

export const useKeyCombo = (combo: KeyCombo, handler: KeyComboHandler) => {
	const pressedKeys   = useRef(new Set<string>());
	const handleKeyDown = useCallback(
		(event: KeyboardEvent) => {
			pressedKeys.current.add(event.key.toLowerCase());

			const keyMatches = event.key.toLowerCase() === combo.key.toLowerCase();
			const ctrlMatches = combo.ctrl === undefined || event.ctrlKey === combo.ctrl;
			const shiftMatches = combo.shift === undefined || event.shiftKey === combo.shift;
			const altMatches = combo.alt === undefined || event.altKey === combo.alt;
			const metaMatches = combo.meta === undefined || event.metaKey === combo.meta;

			if (keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches) {
				event.preventDefault();
				handler();
			}
		},
		[combo, handler]
	);

	const handleKeyUp = useCallback((event: KeyboardEvent) => {
		pressedKeys.current.delete(event.key.toLowerCase());
	}, []);

	useEffect(() => {
		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
		};
	}, [handleKeyDown, handleKeyUp]);
};
