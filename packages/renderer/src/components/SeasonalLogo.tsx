import { Tooltip } from './Tooltip';
import { forwardRef, useMemo } from 'react';
import type { ImgHTMLAttributes } from 'react';

import logo from '~/assets/img/logo.svg';
import bkLogo from '~/assets/img/seasonal-logos/bk.png';

type SeasonalLogoProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'draggable' | 'className'>;

const baseCss = 'mr-2 size-8 shrink-0 z-10' as const;

const seasonalLogos = [
	{
		condition: (date: Date) => date.getMonth() === 5,
		options: [
			{ probability: 50, src: bkLogo, className: baseCss },
			{ probability: 50, src: logo, className: `${baseCss} animate-hue-rotate` }
		]
	},
];

export const SeasonalLogo = forwardRef<HTMLImageElement, SeasonalLogoProps>((props, ref) => {
	const currentDate = useMemo(() => new Date(), []);
	const [logoSrc, className] = useMemo(() => {
		const matchingSeason = seasonalLogos.find(season => season.condition(currentDate));
		if (matchingSeason) {
			let cumulativeProbability = 0;
			const randomValue = Math.random() * 100;

			for (const option of matchingSeason.options) {
				cumulativeProbability += option.probability;
				if (randomValue <= cumulativeProbability) {
					return [option.src, option.className] as const;
				}
			}
		}

		return [logo, baseCss] as const;
	}, [currentDate]);

	return (
		<Tooltip content="Yet Another YouTube Downloader" side="right">
			<img ref={ref} src={logoSrc} className={className} draggable="false" width="32" height="32" {...props}/>
		</Tooltip>
	);
});
