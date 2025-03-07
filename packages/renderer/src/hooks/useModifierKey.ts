import { useState, useEffect } from 'react';

type ModifierKey = 'Alt' | 'Control' | 'Meta' | 'Shift';

export const useModifierKey = (key: ModifierKey): boolean => {
	const [isPressed, setIsPressed] = useState(false);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			switch (key) {
				case 'Alt':
					if (event.altKey) setIsPressed(true);
					break;
				case 'Control':
					if (event.ctrlKey) setIsPressed(true);
					break;
				case 'Meta':
					if (event.metaKey) setIsPressed(true);
					break;
				case 'Shift':
					if (event.shiftKey) setIsPressed(true);
					break;
			}
		};

		const handleKeyUp = (event: KeyboardEvent) => {
			switch (key) {
				case 'Alt':
					if (!event.altKey) setIsPressed(false);
					break;
				case 'Control':
					if (!event.ctrlKey) setIsPressed(false);
					break;
				case 'Meta':
					if (!event.metaKey) setIsPressed(false);
					break;
				case 'Shift':
					if (!event.shiftKey) setIsPressed(false);
					break;
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
		};
	}, [key]);

	return isPressed;
};
