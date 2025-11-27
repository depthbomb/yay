import { useIpc, useFeatureFlags } from '~/hooks';
import { useMemo, useState, useEffect, forwardRef } from 'react';
import type { ImgHTMLAttributes } from 'react';

import logo from '~/assets/img/logo.webp';

const baseCss = 'mr-2 size-7 shrink-0 z-10' as const;

const seasonalLogos = [
	{
		condition: (date: Date) => date.getMonth() === 5,
		options: [
			{ probability: 100, src: logo, className: `${baseCss} animate-hue-rotate` }
		]
	}
];

export const SeasonalLogo = forwardRef<HTMLImageElement, Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'draggable' | 'className'>>((props, ref) => {
	const currentDate                   = useMemo(() => new Date(), []);
	const [isBlurred, setIsBlurred]     = useState(true);
	const [randomValue, setRandomValue] = useState(() => Math.random() * 100);
	const [isFeatureEnabled]            = useFeatureFlags();
	const [onWindowBlurred]             = useIpc('window->is-blurred');
	const [onWindowFocused]             = useIpc('window->is-focused');

	useEffect(() => {
		onWindowBlurred(() => {
			setRandomValue(Math.random() * 100);
			setIsBlurred(true);
		});
		onWindowFocused(() => setIsBlurred(false));
	}, []);

	const [logoSrc, className] = useMemo(() => {
		const matchingSeason = seasonalLogos.find(season => season.condition(currentDate));
		if (matchingSeason) {
			let cumulativeProbability = 0;
			for (const option of matchingSeason.options) {
				cumulativeProbability += option.probability;
				if (randomValue <= cumulativeProbability) {
					return [option.src, option.className] as const;
				}
			}
		}

		return [logo, baseCss] as const;
	}, [currentDate, randomValue, isBlurred]);

	return (
		<div className="space-x-3 w-full flex items-center">
			{!isFeatureEnabled('SeasonalEffects') ? (
				<img ref={ref} src={logo} className={baseCss} draggable="false" width="28" height="28" {...props}/>
			) : (
				<img ref={ref} src={logoSrc} className={className} draggable="false" width="28" height="28" {...props}/>
			)}
			<span className="font-light text-sm">Yet Another YouTube Downloader</span>
		</div>
	)
});
