import { useEffect } from 'react';

const onContextMenu = async () => {
	const active    = document.activeElement;
	const selection = window.getSelection()?.toString().trim();
	const isInput  = active?.tagName === 'TEXTAREA' || (active?.tagName === 'INPUT' && (active as HTMLInputElement).type === 'text');
	if (isInput) {
		if (selection) {
			await window.api.showTextSelectionMenu('input-selection');
		} else {
			await window.api.showTextSelectionMenu('input');
		}
	} else {
		await window.api.showTextSelectionMenu('text-selection');
	}
};

export const useNativeTextMenu = () => {
	useEffect(() => {
		document.body.addEventListener('contextmenu', onContextMenu);

		return () => document.body.removeEventListener('contextmenu', onContextMenu);
	}, []);
};
