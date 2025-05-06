import { useEffect } from 'react';

const onContextMenu = async () => {
	const active    = document.activeElement;
	const selection = window.getSelection()?.toString().trim();
	if (selection) {
		const isInput = active?.tagName === 'TEXTAREA' || (active?.tagName === 'INPUT' && (active as HTMLInputElement).type === 'text');
		await window.api.showTextSelectionMenu(isInput);
	}
};

export const useNativeTextMenu = () => {
	useEffect(() => {
		document.body.addEventListener('contextmenu', onContextMenu);

		return () => document.body.removeEventListener('contextmenu', onContextMenu);
	}, []);
};
