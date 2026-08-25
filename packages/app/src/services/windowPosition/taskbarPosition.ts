export type TaskbarPosition = 'top' | 'right' | 'bottom' | 'left';

type Rectangle = {
	x: number;
	y: number;
	width: number;
	height: number;
};

export function getTaskbarPosition(bounds: Rectangle, workArea: Rectangle, trayBounds: Rectangle): TaskbarPosition {
	if (workArea.y > bounds.y) {
		return 'top';
	}

	if (workArea.x > bounds.x) {
		return 'left';
	}

	if (workArea.x + workArea.width < bounds.x + bounds.width) {
		return 'right';
	}

	if (workArea.y + workArea.height < bounds.y + bounds.height) {
		return 'bottom';
	}

	const trayCenterX = trayBounds.x + trayBounds.width / 2;
	const trayCenterY = trayBounds.y + trayBounds.height / 2;
	const distances: Record<TaskbarPosition, number> = {
		top: Math.abs(trayCenterY - bounds.y),
		right: Math.abs(bounds.x + bounds.width - trayCenterX),
		bottom: Math.abs(bounds.y + bounds.height - trayCenterY),
		left: Math.abs(trayCenterX - bounds.x),
	};

	return (Object.entries(distances) as [TaskbarPosition, number][])
		.reduce((nearest, candidate) => candidate[1] < nearest[1] ? candidate : nearest)[0];
}
