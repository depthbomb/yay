import { forwardRef, useMemo } from 'react';
import type { ImgHTMLAttributes } from 'react';

import logo from '~/assets/img/logo.svg';
import bkLogo from '~/assets/img/seasonal-logos/bk.png';

type SeasonalLogoProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'draggable' | 'className'>;

const baseCss = 'mr-2 size-7' as const;

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
	const { logoSrc, className } = useMemo(() => {
		const matchingSeason = seasonalLogos.find(season =>
			season.condition(currentDate)
		);

		if (matchingSeason) {
			let cumulativeProbability = 0;
			const randomValue = Math.random() * 100;

			for (const option of matchingSeason.options) {
				cumulativeProbability += option.probability;
				if (randomValue <= cumulativeProbability) {
					return { logoSrc: option.src, className: option.className };
				}
			}
		}

		return { logoSrc: logo, className: baseCss };
	}, [currentDate]);

	return (
		<img ref={ref} src={logoSrc} className={className} draggable="false" width="28" height="28" {...props}/>
	);
});
