import { useEffect } from 'react';

const onContextMenu = async () => {
	const active    = document.activeElement;
	const selection = window.getSelection()?.toString().trim();
	const isInput   = active?.tagName === 'TEXTAREA' || (active?.tagName === 'INPUT' && (active as HTMLInputElement).type === 'text');
	const menuType  = isInput ? selection ? 'input-selection' : 'input' : selection ? 'text-selection' : null;
	if (menuType) {
		await window.api.showTextSelectionMenu(menuType);
	}
};

export const useNativeTextMenu = () => {
	useEffect(() => {
		document.body.addEventListener('contextmenu', onContextMenu);

		return () => document.body.removeEventListener('contextmenu', onContextMenu);
	}, []);
};
