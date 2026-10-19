import { native } from '~/native';
import { RequestChannel } from './ipc/ipc.generated';
import { DebugRequestChannel } from './ipc/ipc.debug.generated';

export async function runDiagnostics(): Promise<void> {
	const pause = () => new Promise<void>(resolve => setTimeout(resolve, 100));
	const tabs: Record<string, string> = {};
	const assets: Record<string, boolean> = {};
	await document.fonts.ready;
	if (location.hash === '#/') {
		const page = await fetch('/renderer.html?embedded-test');
		const head = await fetch('/renderer.html', { method: 'HEAD' });
		const missing = await fetch('/missing-embedded-asset');
		const unsupported = await fetch('/renderer.html', { method: 'POST' });
		assets.html = page.ok && page.headers.get('content-type') === 'text/html; charset=utf-8' && (await page.text()).includes('id="app"');
		assets.head = head.ok && Number(head.headers.get('content-length')) > 0 && (await head.text()) === '';
		assets.missing = missing.status === 404;
		assets.method = unsupported.status === 405 && unsupported.headers.get('allow') === 'GET, HEAD';

		const fontUrl = performance.getEntriesByType('resource').find(entry => entry.name.endsWith('.woff2'))?.name;
		if (fontUrl) {
			const font = await fetch(fontUrl);
			const signature = new TextDecoder().decode((await font.arrayBuffer()).slice(0, 4));
			assets.font = font.ok && font.headers.get('content-type') === 'font/woff2' && signature === 'wOF2';
		} else {
			assets.font = false;
		}
	}

	if (location.hash === '#/settings') {
		for (const label of ['Downloads', 'YouTube', 'Advanced', 'About', 'Application']) {
			const button = Array.from(document.querySelectorAll('button')).find(element => element.textContent?.trim() === label);
			button?.click();
			await pause();
			tabs[label] = document.body.innerText;
		}
	}

	const settings = await native.ipc.invoke(RequestChannel.SettingsGetAll);
	const accent = await native.ipc.invoke(RequestChannel.ThemingGetAccentColor);
	const flags = await native.ipc.invoke(RequestChannel.FeatureFlagGetFeatureFlags);
	const system = await native.ipc.invoke(RequestChannel.SystemGetInfo);
	const root = document.getElementById('app');
	const result = {
		route: location.hash,
		rendered: Boolean(root?.children.length),
		title: document.title,
		tabs,
		assets,
		text: document.body.innerText,
		viewport: { width: innerWidth, height: innerHeight, scale: devicePixelRatio },
		controls: Array.from(document.querySelectorAll('button,input,[role="tab"]')).map(element => ({
			tag: element.tagName,
			text: element.textContent?.trim(),
			label: element.getAttribute('aria-label'),
		})),
		ipc: { settings: settings.isOk, accent: accent.isOk, flags: flags.isOk, system: system.isOk },
	};

	await native.ipc.invoke(DebugRequestChannel.NativeDiagnostics, result);
}
