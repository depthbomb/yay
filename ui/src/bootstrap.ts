import { native } from './native';

await import('./renderer');

if (__YAY_DEBUG__ && native.diagnostics) {
	const { runDiagnostics } = await import('./diagnostics');
	setTimeout(() => { void runDiagnostics(); }, 1000);
}
