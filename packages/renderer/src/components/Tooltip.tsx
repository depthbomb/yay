import clsx from 'clsx';
import { createPortal } from 'react-dom';
import { useState, useEffect, useRef } from 'react';
import type { FC, ReactNode, MouseEvent, PropsWithChildren } from 'react';

type TooltipPosition = 'top' | 'left' | 'bottom' | 'right';

type TooltipProps = PropsWithChildren & {
	content: ReactNode;
	delay?: number;
	position?: TooltipPosition;
	className?: string;
};

export const Tooltip: FC<TooltipProps> = ({ children, content, delay = 100, position = 'top', className }) => {
	const [isVisible, setIsVisible]     = useState(false);
	const [coordinates, setCoordinates] = useState({ x: 0, y: 0 });
	const timeoutRef                    = useRef<NodeJS.Timeout>(null);
	const childRef                      = useRef<HTMLDivElement>(null);

	const handleMouseEnter = () => {
		timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
	};

	const handleMouseLeave = () => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}

		setIsVisible(false);
	};

	const handleMouseMove = (e: MouseEvent) => {
		const x = e.clientX;
		const y = e.clientY;
		setCoordinates({ x, y });
	};

	const getTooltipStyles = () => {
		switch (position) {
			case 'right':
				return {
					left: `${coordinates.x + 8}px`,
					top: `${coordinates.y}px`,
					transform: 'translateY(-50%)',
				};
			case 'bottom':
				return {
					left: `${coordinates.x}px`,
					top: `${coordinates.y + 8}px`,
					transform: 'translateX(-50%)',
				};
			case 'left':
				return {
					left: `${coordinates.x - 8}px`,
					top: `${coordinates.y}px`,
					transform: 'translate(-100%, -50%)',
				};
			case 'top':
			default:
				return {
					left: `${coordinates.x}px`,
					top: `${coordinates.y - 8}px`,
					transform: 'translate(-50%, -100%)',
				};
		}
	};

	useEffect(() => {
		const child = childRef.current;
		if (child) {
			child.addEventListener('mouseenter', handleMouseEnter);
			child.addEventListener('mouseleave', handleMouseLeave);
			child.addEventListener('mousemove', handleMouseMove as any);
		}

		return () => {
			if (child) {
				child.removeEventListener('mouseenter', handleMouseEnter);
				child.removeEventListener('mouseleave', handleMouseLeave);
				child.removeEventListener('mousemove', handleMouseMove as any);
			}

			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	const wrappedChildren = (
		<span ref={childRef} className="inline">
			{children}
		</span>
	);

	const tooltipPortal = isVisible && createPortal(
		<div
			className={clsx(
				"fixed z-[9001] px-2 py-1",
				"bg-gray-900 rounded-sm shadow",
				"text-xs whitespace-nowrap",
				"pointer-events-none",
				className
			)}
			style={getTooltipStyles()}
		>
			{content}
		</div>,
		document.body
	);

	return (
		<>
			{wrappedChildren}
			{tooltipPortal}
		</>
	);
};
