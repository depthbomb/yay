import { createPortal } from 'react-dom';
import { useRef, useState, useEffect } from 'react';
import type { Nullable } from 'shared';
import type { FC, ReactNode } from 'react';

export type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

type TooltipProps = {
	children: ReactNode;
	content: ReactNode;
	side?: TooltipSide;
	delay?: number;
	offset?: number;
	className?: string;
	showArrow?: boolean;
};

type Position = {
	x: number;
	y: number;
};

export const TooltipV2: FC<TooltipProps> = ({
	children,
	content,
	side = 'top',
	delay = 50,
	offset = 8,
	className = '',
	showArrow = true,
}) => {
	const triggerRef = useRef<HTMLDivElement>(null);
	const tooltipRef = useRef<HTMLDivElement>(null);
	const timeoutRef = useRef<Nullable<NodeJS.Timeout>>(null);
	const rafRef = useRef<Nullable<number>>(null);
	const [isVisible, setIsVisible] = useState(false);
	const [isReady, setIsReady] = useState(false);
	const [position, setPosition] = useState<Position>({ x: 0, y: 0 });

	useEffect(() => {
		const handleBlur = () => {
			setIsVisible(false);
			setIsReady(false);
		};
		window.addEventListener('blur', handleBlur);
		return () => window.removeEventListener('blur', handleBlur);
	}, []);

	useEffect(() => {
		if (!isVisible || !triggerRef.current) return;

		rafRef.current = requestAnimationFrame(() => {
			if (!triggerRef.current || !tooltipRef.current) return;

			const triggerRect = triggerRef.current.getBoundingClientRect();
			const tooltipRect = tooltipRef.current.getBoundingClientRect();

			let x = 0;
			let y = 0;

			switch (side) {
				case 'top':
					x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
					y = triggerRect.top - tooltipRect.height - offset;
					break;
				case 'bottom':
					x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
					y = triggerRect.bottom + offset;
					break;
				case 'left':
					x = triggerRect.left - tooltipRect.width - offset;
					y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
					break;
				case 'right':
					x = triggerRect.right + offset;
					y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
					break;
			}

			const padding = 8;
			if (x < padding) x = padding;
			if (x + tooltipRect.width > window.innerWidth - padding)
				x = window.innerWidth - tooltipRect.width - padding;
			if (y < padding) y = padding;
			if (y + tooltipRect.height > window.innerHeight - padding)
				y = window.innerHeight - tooltipRect.height - padding;

			setPosition({ x, y });
			setIsReady(true);
		});

		return () => {
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
		};
	}, [isVisible, side, offset]);

	const handleMouseEnter = () => {
		timeoutRef.current = setTimeout(() => {
			setIsVisible(true);
		}, delay);
	};

	const handleMouseLeave = () => {
		if (timeoutRef.current) clearTimeout(timeoutRef.current);
		setIsVisible(false);
		setIsReady(false);
	};

	useEffect(() => {
		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
		};
	}, []);

	const arrowClasses: Record<string, string> = {
		top: 'left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2 rotate-45',
		bottom: 'left-1/2 -translate-x-1/2 top-0 -translate-y-1/2 rotate-45',
		left: 'top-1/2 -translate-y-1/2 right-0 translate-x-1/2 rotate-45',
		right: 'top-1/2 -translate-y-1/2 left-0 -translate-x-1/2 rotate-45',
	};

	return (
		<>
			<div
				ref={triggerRef}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
				className="inline-block relative"
			>
				{children}
			</div>

			{isVisible && content &&
				createPortal(
					<div
						ref={tooltipRef}
						className={`fixed z-50 pointer-events-none transition-opacity duration-150 ${isReady ? 'opacity-100' : 'opacity-0'
							} ${className}`}
						style={{
							left: `${position.x}px`,
							top: `${position.y}px`,
						}}
					>
						<div className="relative bg-gray-900 text-white text-xs px-2 py-1 rounded max-w-xs">
							{content}
							{showArrow && (
								<div
									className={`absolute w-2 h-2 bg-gray-900 ${arrowClasses[side]}`}
								/>
							)}
						</div>
					</div>,
					document.body
				)}
		</>
	);
};
