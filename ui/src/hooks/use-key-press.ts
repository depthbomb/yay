import { useEffect, useEffectEvent } from 'react';

type KeyPressOptions = {
	exactMatch?: boolean;
};

export const useKeyPress = (bindings: string | string[], handler: () => void, options?: KeyPressOptions) => {
	const stableHandler = useEffectEvent(handler);
	const bindingList   = Array.isArray(bindings) ? bindings : [bindings];
	const signature     = bindingList.join('|').toLowerCase();

	useEffect(() => {
		const expectedBindings = signature.split('|').map(binding => binding.split('.'));
		const listener = (event: KeyboardEvent) => {
			const key = event.key.toLowerCase();
			const matched = expectedBindings.some(binding => {
				const expectedKey   = binding[binding.length - 1];
				const expectsCtrl   = binding.includes('ctrl');
				const expectsAlt    = binding.includes('alt');
				const expectsShift  = binding.includes('shift');
				const requiredMatch = key === expectedKey
					&& (!expectsCtrl || event.ctrlKey)
					&& (!expectsAlt || event.altKey)
					&& (!expectsShift || event.shiftKey);

				return requiredMatch && (!options?.exactMatch || (
					event.ctrlKey === expectsCtrl
					&& event.altKey === expectsAlt
					&& event.shiftKey === expectsShift
					&& !event.metaKey
				));
			});

			if (matched) {
				stableHandler();
			}
		};

		window.addEventListener('keydown', listener);
		return () => window.removeEventListener('keydown', listener);
	}, [signature, options?.exactMatch]);
};
