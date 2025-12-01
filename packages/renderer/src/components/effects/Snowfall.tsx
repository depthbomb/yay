import { useRef, useEffect } from 'react';
import type { FC } from 'react';
import type { Nullable } from 'shared';

type Snowflake = {
	x: number;
	y: number;
	radius: number;
	speed: number;
	drift: number;
	driftPhase: number;
	trail: { x: number; y: number }[];
};

export interface ISnowfallProps {
	snowflakeCount?: number;
	fallSpeed?: number;
	maxSize?: number;
	minSize?: number;
	opacity?: number;
	trailLength?: number;
}

const Snowfall: FC<ISnowfallProps> = ({
	snowflakeCount = 50,
	fallSpeed = 25,
	maxSize = 3,
	minSize = 1,
	opacity = 0.25,
	trailLength = 1,
}) => {
	const canvasRef = useRef<Nullable<HTMLCanvasElement>>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) {
			return;
		}
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			return;
		}

		let animationFrameID: number;
		canvas.width  = window.innerWidth;
		canvas.height = window.innerHeight;

		window.addEventListener('resize', () => {
			canvas.width  = window.innerWidth;
			canvas.height = window.innerHeight;
		});

		const snowflakes: Snowflake[] = Array.from({ length: snowflakeCount }, () => ({
			x: Math.random() * canvas.width,
			y: Math.random() * canvas.height,
			radius: Math.random() * (maxSize - minSize) + minSize,
			speed: Math.random() * 0.5 + 0.5,
			drift: Math.random() * 1.5 + 0.5,
			driftPhase: Math.random() * Math.PI * 2,
			trail: [],
		}));

		const resetFlake = (flake: Snowflake) => {
			flake.y     = -flake.radius;
			flake.x     = Math.random() * canvas.width;
			flake.trail = [];
		};

		const render = () => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			for (const flake of snowflakes) {
				flake.trail.unshift({ x: flake.x, y: flake.y });
				if (flake.trail.length > trailLength) {
					flake.trail.pop();
				}

				flake.trail.forEach((pos, i) => {
					const trailOpacity = (opacity * (trailLength - i)) / trailLength;
					const trailRadius  = (flake.radius * (trailLength - i)) / trailLength;
					ctx.beginPath();
					ctx.arc(pos.x, pos.y, trailRadius, 0, Math.PI * 2);
					ctx.fillStyle = `rgba(255, 255, 255, ${trailOpacity})`;
					ctx.fill();
				});

				flake.y          += (flake.speed * fallSpeed) / 60;
				flake.x          += Math.sin(flake.driftPhase) * flake.drift * 0.3;
				flake.driftPhase += 0.01;

				if (
					flake.y > canvas.height + flake.radius ||
					flake.x < -flake.radius ||
					flake.x > canvas.width + flake.radius
				) {
					resetFlake(flake);
				}
			}

			animationFrameID = requestAnimationFrame(render);
		};

		render();

		return () => {
			cancelAnimationFrame(animationFrameID);
		};
	}, [snowflakeCount, fallSpeed, maxSize, minSize, opacity, trailLength]);

	return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full pointer-events-none z-99999"/>;
};

export default Snowfall;
