import { useEffect } from 'react';
import type { Nullable } from 'shared';

type KeyHandler = (event: KeyboardEvent) => void;

type UseKeyPressOptions = {
	key: string | string[];
	onKeyPress: KeyHandler;
	modifiers?: {
		ctrl?: boolean;
		shift?: boolean;
		alt?: boolean;
		meta?: boolean;
	};
	target?: Nullable<HTMLElement | Window>;
	preventDefault?: boolean;
}

export const useKeyPress = ({ key, onKeyPress, modifiers, target = window, preventDefault = false }: UseKeyPressOptions) => {
	useEffect(() => {
		if (!target) {
			return;
		}

		const keys          = Array.isArray(key) ? key : [key];
		const handleKeyDown = (e: KeyboardEvent) => {
			const keyMatch = keys.some(k => e.key === k || e.code === k);
			if (!keyMatch) {
				return;
			}

			if (modifiers) {
				const ctrlMatch  = modifiers.ctrl === undefined || e.ctrlKey === modifiers.ctrl;
				const shiftMatch = modifiers.shift === undefined || e.shiftKey === modifiers.shift;
				const altMatch   = modifiers.alt === undefined || e.altKey === modifiers.alt;
				const metaMatch  = modifiers.meta === undefined || e.metaKey === modifiers.meta;

				if (!ctrlMatch || !shiftMatch || !altMatch || !metaMatch) {
					return;
				}
			}

			if (preventDefault) {
				e.preventDefault();
			}

			onKeyPress(e);
		};

		target.addEventListener('keydown', handleKeyDown as EventListener);

		return () => {
			target.removeEventListener('keydown', handleKeyDown as EventListener);
		};
	}, [key, onKeyPress, modifiers, target, preventDefault]);
}
