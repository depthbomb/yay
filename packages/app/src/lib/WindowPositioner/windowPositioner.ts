import { Positioner } from './positioner';
import { WindowPosition } from './WindowPosition';
import { Tray, screen, Rectangle } from 'electron';
import { TaskbarLocation } from './TaskbarLocation';
import type { BrowserWindow } from 'electron';


export class WindowPositioner {
	public positionWindowAtTray(window: BrowserWindow, tray: Tray): void {
		let windowPosition;
		if (__WIN32__ || __LINUX__) {
			windowPosition = this.getWindowPosition(tray);
		}

		const trayBounds = tray.getBounds();

		let noBoundsPosition = WindowPosition.BottomRight;
		if (trayBounds.x === 0 && windowPosition?.startsWith('tray')) {
			noBoundsPosition = WindowPosition.TopRight;
		}

		const positioner = new Positioner(window);
		const { x, y }   = positioner.calculate(windowPosition ?? noBoundsPosition, trayBounds);

		window.setPosition(x, y);
	}

	public getTaskbarLocation(tray: Tray): TaskbarLocation {
		const [screenBounds, workArea] = this.trayToScreenRects(tray);

		if (workArea.x > 0) {
			if (__LINUX__ && workArea.y > 0) {
				return TaskbarLocation.Top;
			}

			return TaskbarLocation.Left;
		}

		if (workArea.y > 0) {
			return TaskbarLocation.Top;
		}

		if (workArea.width < screenBounds.width) {
			return TaskbarLocation.Right;
		}

		return TaskbarLocation.Bottom;
	}

	public getWindowPosition(tray: Tray): WindowPosition {
		let windowPosition = WindowPosition.TopRight;

		if (__MACOS__) {
			return WindowPosition.TrayCenter;
		}

		if (__LINUX__ || __WIN32__) {
			const traySide = this.getTaskbarLocation(tray);
			if (traySide === TaskbarLocation.Top) {
				windowPosition = __LINUX__ ? WindowPosition.TopRight : WindowPosition.TrayCenter;
			}
			if (traySide === TaskbarLocation.Bottom) {
				windowPosition = __LINUX__ ? WindowPosition.BottomRight : WindowPosition.TrayBottomCenter;
			}
			if (traySide === TaskbarLocation.Left) {
				windowPosition = WindowPosition.BottomLeft;
			}
			if (traySide === TaskbarLocation.Right) {
				windowPosition = WindowPosition.BottomRight;
			}
		}

		// When we really don't know, we just assume top-right
		return windowPosition;
	}

	private trayToScreenRects(tray: Tray): [Rectangle, Rectangle] {
		const { workArea, bounds: screenBounds } = screen.getDisplayMatching(tray.getBounds());

		workArea.x -= screenBounds.x;
		workArea.y -= screenBounds.y;

		return [screenBounds, workArea];
	}
}
