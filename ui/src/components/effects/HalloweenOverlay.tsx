import { getHalloweenEffectChance } from './halloween';
import skeleton from '~/assets/img/holiday/skeleton.webp';
import { useRef, useState, useEffect, useCallback } from 'react';

const MINIMUM_DELAY_MS = 1_000 as const;
const MAXIMUM_DELAY_MS = 5_000 as const;
const DISPLAY_TIME_MS  = 1_500 as const;

export const HalloweenOverlay = () => {
	const [visible, setVisible] = useState(false);
	const focused               = useRef(document.hasFocus());
	const waitTimer             = useRef<number | null>(null);
	const hideTimer             = useRef<number | null>(null);

	const clearTimers = useCallback(() => {
		if (waitTimer.current !== null) {
			window.clearTimeout(waitTimer.current);
			waitTimer.current = null;
		}

		if (hideTimer.current !== null) {
			window.clearTimeout(hideTimer.current);
			hideTimer.current = null;
		}
	}, []);

	const attemptOverlay = useCallback(() => {
		clearTimers();
		setVisible(false);

		const chance = getHalloweenEffectChance(new Date());
		if (chance === 0 || Math.random() >= chance) {
			return;
		}

		const delay = MINIMUM_DELAY_MS + Math.random() * (MAXIMUM_DELAY_MS - MINIMUM_DELAY_MS);
		waitTimer.current = window.setTimeout(() => {
			waitTimer.current = null;
			if (!focused.current) {
				return;
			}

			setVisible(true);
			hideTimer.current = window.setTimeout(() => {
				setVisible(false);
				hideTimer.current = null;
			}, DISPLAY_TIME_MS);
		}, delay);
	}, [clearTimers]);

	useEffect(() => {
		const handleFocus = () => {
			focused.current = true;
			attemptOverlay();
		};
		const handleBlur = () => {
			focused.current = false;
			clearTimers();
			setVisible(false);
		};

		window.addEventListener('focus', handleFocus);
		window.addEventListener('blur', handleBlur);

		if (focused.current) {
			attemptOverlay();
		}

		return () => {
			window.removeEventListener('focus', handleFocus);
			window.removeEventListener('blur', handleBlur);
			clearTimers();
		};
	}, [attemptOverlay, clearTimers]);

	if (!visible) {
		return null;
	}

	return (
		<img
			src={skeleton}
			alt=""
			aria-hidden="true"
			draggable={false}
			className="fixed inset-x-0 top-1/2 z-[2147483647] w-full h-auto max-w-none -translate-y-1/2 pointer-events-none"
		/>
	);
};
