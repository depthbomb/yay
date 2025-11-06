import { Tray, screen } from 'electron';
import { EWindowPosition } from './EWindowPosition';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import type { Rectangle, BrowserWindow } from 'electron';

type PositionOptions = {
	/**
	 * Whether to use the primary display or the display containing the mouse cursor
	 * @default true
	 */
	usePrimaryDisplay?: boolean;
	/**
	 * Optional padding (in pixels) from the edge of the screen
	 * @default 0
	 */
	padding?: number;
};

@injectable()
export class WindowPositionService {
	private readonly windowPositions: Map<BrowserWindow, [number, number]>;

	public constructor(
		private readonly logger = inject(LoggingService),
	) {
		this.windowPositions = new Map();
	}

	public setWindowPosition(window: BrowserWindow, position: EWindowPosition, options: PositionOptions = {}) {
		const { usePrimaryDisplay = true, padding = 0 } = options;
		const display                                   = this.getTargetDisplay(usePrimaryDisplay);
		const windowBounds                              = window.getBounds();
		const windowWidth                               = windowBounds.width;
		const windowHeight                              = windowBounds.height;
		const workArea                                  = display.workArea;

		const { x, y } = this.calculatePosition(
			position,
			workArea,
			windowWidth,
			windowHeight,
			padding
		);

		window.setPosition(x, y);
	}

	public setWindowPositionAtTray(window: BrowserWindow, tray: Tray, padding: number = 0) {
		const [curX, curY] = window.getPosition();
		if (!this.windowPositions.has(window)) {
			this.windowPositions.set(window, [curX, curY]);
		}

		const windowBounds = window.getBounds();
		const trayBounds = tray.getBounds();

		let x = 0;
		let y = 0;

		const displays = screen.getAllDisplays();
		const trayDisplay = displays.find((display) => {
			const displayBounds = display.bounds;
			return (
				trayBounds.x >= displayBounds.x &&
				trayBounds.y >= displayBounds.y &&
				trayBounds.x <= displayBounds.x + displayBounds.width &&
				trayBounds.y <= displayBounds.y + displayBounds.height
			);
		}) || screen.getPrimaryDisplay();

		const workArea = trayDisplay.workArea;

		if (__WIN32__) {
			// Windows: Position based on taskbar position
			const taskbarIsHorizontal = workArea.height < trayDisplay.bounds.height;
			if (taskbarIsHorizontal) {
				// Taskbar is at top or bottom
				if (workArea.y > 0) {
					// Taskbar is at top
					x = trayBounds.x + Math.floor(trayBounds.width / 2) - Math.floor(windowBounds.width / 2);
					y = trayBounds.y + trayBounds.height + padding;
				} else {
					// Taskbar is at bottom
					x = trayBounds.x + Math.floor(trayBounds.width / 2) - Math.floor(windowBounds.width / 2);
					y = trayBounds.y - windowBounds.height - padding;
				}
			} else {
				// Taskbar is at left or right
				if (workArea.x > 0) {
					// Taskbar is at left
					x = trayBounds.x + trayBounds.width + padding;
					y = trayBounds.y + Math.floor(trayBounds.height / 2) - Math.floor(windowBounds.height / 2);
				} else {
					// Taskbar is at right
					x = trayBounds.x - windowBounds.width - padding;
					y = trayBounds.y + Math.floor(trayBounds.height / 2) - Math.floor(windowBounds.height / 2);
				}
			}
		} else if (__MACOS__) {
			// macOS: Tray is always at the top
			x = Math.floor(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2);
			y = trayBounds.y + trayBounds.height + padding;
		} else {
			// Linux: Can vary, check where the taskbar is
			const taskbarIsHorizontal = workArea.height < trayDisplay.bounds.height;
			if (taskbarIsHorizontal) {
				if (workArea.y > 0) {
					// Taskbar is at top
					x = trayBounds.x + Math.floor(trayBounds.width / 2) - Math.floor(windowBounds.width / 2);
					y = trayBounds.y + trayBounds.height + padding;
				} else {
					// Taskbar is at bottom
					x = trayBounds.x + Math.floor(trayBounds.width / 2) - Math.floor(windowBounds.width / 2);
					y = trayBounds.y - windowBounds.height - padding;
				}
			} else {
				if (workArea.x > 0) {
					// Taskbar is at left
					x = trayBounds.x + trayBounds.width + padding;
					y = trayBounds.y + Math.floor(trayBounds.height / 2) - Math.floor(windowBounds.height / 2);
				} else {
					// Taskbar is at right
					x = trayBounds.x - windowBounds.width - padding;
					y = trayBounds.y + Math.floor(trayBounds.height / 2) - Math.floor(windowBounds.height / 2);
				}
			}
		}

		x = Math.max(workArea.x, Math.min(x, workArea.x + workArea.width - windowBounds.width));
		y = Math.max(workArea.y, Math.min(y, workArea.y + workArea.height - windowBounds.height));

		if (x === curX && y === curY) {
			return;
		}

		this.logger.debug('Setting window position', { window: window.getTitle(), before: [...window.getPosition()], after: [x, y] });

		window.setPosition(x, y);

		this.windowPositions.set(window, [x, y]);
	}

	private getTargetDisplay(usePrimaryDisplay: boolean) {
		if (usePrimaryDisplay) {
			return screen.getPrimaryDisplay();
		} else {
			return screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
		}
	}

	private calculatePosition(
		position: EWindowPosition,
		workArea: Rectangle,
		windowWidth: number,
		windowHeight: number,
		padding: number
	) {
		const left    = workArea.x + padding;
		const right   = workArea.x + workArea.width - windowWidth - padding;
		const top     = workArea.y + padding;
		const bottom  = workArea.y + workArea.height - windowHeight - padding;
		const centerX = workArea.x + Math.floor(workArea.width / 2) - Math.floor(windowWidth / 2);
		const centerY = workArea.y + Math.floor(workArea.height / 2) - Math.floor(windowHeight / 2);

		switch (position) {
			case EWindowPosition.TopRight:
				return { x: right, y: top };
			case EWindowPosition.MiddleRight:
				return { x: right, y: centerY };
			case EWindowPosition.BottomRight:
				return { x: right, y: bottom };
			case EWindowPosition.BottomMiddle:
				return { x: centerX, y: bottom };
			case EWindowPosition.BottomLeft:
				return { x: left, y: bottom };
			case EWindowPosition.MiddleLeft:
				return { x: left, y: centerY };
			case EWindowPosition.TopLeft:
				return { x: left, y: top };
			case EWindowPosition.MiddleTop:
				return { x: centerX, y: top };
			case EWindowPosition.Center:
				return { x: centerX, y: centerY };
			default:
				return { x: centerX, y: centerY }; // Default to center
		}
	}
}
