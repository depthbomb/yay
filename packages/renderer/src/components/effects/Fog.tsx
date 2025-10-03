import { useRef, useEffect } from 'react';
import type { FC } from 'react';

type FogOverlayProps = {
	opacity?: number;   // base opacity of fog
	speed?: number;     // max horizontal speed
	density?: number;   // number of fog blobs
	layers?: number;    // number of layered fog sets
};

const FogOverlay: FC<FogOverlayProps> = ({
	opacity = 0.05,
	speed = 0.2,
	density = 30,
	layers = 3,
}) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		const handleResize = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		};
		window.addEventListener('resize', handleResize);

		type FogBlob = {
			x: number;
			y: number;
			radius: number;
			driftX: number;
			driftY: number;
			phase: number; // for vertical oscillation
			opacity: number;
		};

		const fogLayers: FogBlob[][] = Array.from({ length: layers }, () =>
			Array.from({ length: density }, () => ({
				x: Math.random() * canvas.width,
				y: Math.random() * canvas.height,
				radius: Math.random() * 300 + 100,
				driftX: (Math.random() - 0.5) * speed,
				driftY: (Math.random() - 0.5) * speed * 0.3,
				phase: Math.random() * Math.PI * 2,
				opacity: Math.random() * opacity * 0.8 + opacity * 0.2,
			}))
		);

		let animationFrameId: number;

		const render = () => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			for (const layer of fogLayers) {
				for (const blob of layer) {
					const yOffset  = Math.sin(blob.phase) * 5;
					const gradient = ctx.createRadialGradient(
						blob.x,
						blob.y + yOffset,
						0,
						blob.x,
						blob.y + yOffset,
						blob.radius
					);
					gradient.addColorStop(0, `rgba(200,200,200,${blob.opacity})`);
					gradient.addColorStop(1, 'rgba(200,200,200,0)');

					ctx.fillStyle = gradient;
					ctx.beginPath();
					ctx.arc(blob.x, blob.y + yOffset, blob.radius, 0, Math.PI * 2);
					ctx.fill();

					blob.x += blob.driftX;
					blob.y += blob.driftY;
					blob.phase += 0.01;

					if (blob.x < -blob.radius)                blob.x = canvas.width + blob.radius;
					if (blob.x > canvas.width + blob.radius)  blob.x = -blob.radius;
					if (blob.y < -blob.radius)                blob.y = canvas.height + blob.radius;
					if (blob.y > canvas.height + blob.radius) blob.y = -blob.radius;
				}
			}

			animationFrameId = requestAnimationFrame(render);
		};

		render();

		return () => {
			cancelAnimationFrame(animationFrameId);
			window.removeEventListener('resize', handleResize);
		};
	}, [opacity, speed, density, layers]);

	return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full pointer-events-none z-[99999]" />;
};

export default FogOverlay;
