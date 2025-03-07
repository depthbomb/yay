import { screen, Rectangle } from 'electron';
import { WindowPosition } from './WindowPosition';
import type { BrowserWindow } from 'electron';

export class Positioner {
	private readonly _window: BrowserWindow;

	public constructor(window: BrowserWindow) {
		this._window = window;
	}

	public move(position: WindowPosition, trayPosition?: Rectangle) {
		const { x, y } = this.getCoords(position, trayPosition);

		this._window.setPosition(x, y);
	}

	public calculate(position: WindowPosition, trayPosition?: Rectangle) {
		const { x, y } = this.getCoords(position, trayPosition);

		return { x, y };
	}

	private getCoords(position: WindowPosition, trayPosition?: Rectangle) {
		const screenSize = this.getScreenSize(trayPosition);
		const windowSize = this.getWindowSize();

		if (!trayPosition) {
			trayPosition = { width: 0, height: 0, x: 0, y: 0 };
		}

		const positions = {
			trayLeft: {
				x: Math.floor(trayPosition.x),
				y: screenSize.y
			},
			trayBottomLeft: {
				x: Math.floor(trayPosition.x),
				y: Math.floor(screenSize.height - (windowSize[1] - screenSize.y))
			},
			trayRight: {
				x: Math.floor(trayPosition.x - (windowSize[0]) + trayPosition.width),
				y: screenSize.y
			},
			trayBottomRight: {
				x: Math.floor(trayPosition.x - (windowSize[0]) + trayPosition.width),
				y: Math.floor(screenSize.height - (windowSize[1] - screenSize.y))
			},
			trayCenter: {
				x: Math.floor(trayPosition.x - ((windowSize[0] / 2)) + (trayPosition.width / 2)),
				y: screenSize.y
			},
			trayBottomCenter: {
				x: Math.floor(trayPosition.x - ((windowSize[0] / 2)) + (trayPosition.width / 2)),
				y: Math.floor(screenSize.height - (windowSize[1] - screenSize.y))
			},
			topLeft: {
				x: screenSize.x,
				y: screenSize.y
			},
			topRight: {
				x: Math.floor(screenSize.x + (screenSize.width - windowSize[0])),
				y: screenSize.y
			},
			bottomLeft: {
				x: screenSize.x,
				y: Math.floor(screenSize.height - (windowSize[1] - screenSize.y))
			},
			bottomRight: {
				x: Math.floor(screenSize.x + (screenSize.width - windowSize[0])),
				y: Math.floor(screenSize.height - (windowSize[1] - screenSize.y))
			},
			topCenter: {
				x: Math.floor(screenSize.x + ((screenSize.width / 2) - (windowSize[0] / 2))),
				y: screenSize.y
			},
			bottomCenter: {
				x: Math.floor(screenSize.x + ((screenSize.width / 2) - (windowSize[0] / 2))),
				y: Math.floor(screenSize.height - (windowSize[1] - screenSize.y))
			},
			leftCenter: {
				x: screenSize.x,
				y: screenSize.y + Math.floor(screenSize.height / 2) - Math.floor(windowSize[1] / 2)
			},
			rightCenter: {
				x: Math.floor(screenSize.x + (screenSize.width - windowSize[0])),
				y: screenSize.y + Math.floor(screenSize.height / 2) - Math.floor(windowSize[1] / 2)
			},
			center: {
				x: Math.floor(screenSize.x + ((screenSize.width / 2) - (windowSize[0] / 2))),
				y: Math.floor(((screenSize.height + screenSize.y) / 2) - (windowSize[1] / 2))
			}
		};

		if (position.startsWith('tray')) {
			if ((positions[position].x + windowSize[0]) > (screenSize.width + screenSize.x)) {
				return {
					x: positions.topRight.x,
					y: positions[position].y
				};
			}
		}

		return positions[position];
	}

	private getScreenSize(trayPosition?: Rectangle): Rectangle {
		if (trayPosition) {
			return screen.getDisplayMatching(trayPosition).workArea;
		}

		return screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
	}

	private getWindowSize(): number[] {
		return this._window.getSize();
	}
}
