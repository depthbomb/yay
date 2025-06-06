import { useAtom } from 'jotai';
import { IpcChannel } from 'shared';
import { windowPinnedAtom } from '~/atoms/app';
import { useIpc, useFeatureFlags } from '~/hooks';
import { useMemo, useState, useEffect, forwardRef } from 'react';
import type { ImgHTMLAttributes } from 'react';

import logo from '~/assets/img/logo.svg';
import bkLogo from '~/assets/img/seasonal-logos/bk.png';

type SeasonalLogoProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'draggable' | 'className'>;

const baseCss = 'mr-2 size-8 shrink-0 z-10' as const;

const seasonalLogos = [
	{
		condition: (date: Date) => date.getMonth() === 5,
		options: [
			{ probability: 25, src: bkLogo, className: baseCss },
			{ probability: 75, src: logo, className: `${baseCss} animate-hue-rotate` }
		]
	},
];

export const SeasonalLogo = forwardRef<HTMLImageElement, SeasonalLogoProps>((props, ref) => {
	const currentDate               = useMemo(() => new Date(), []);
	const [isBlurred, setIsBlurred] = useState(true);
	const [windowPinned]            = useAtom(windowPinnedAtom);
	const [isFeatureEnabled]        = useFeatureFlags();
	const [onWindowBlurred]         = useIpc(IpcChannel.Window_IsBlurred);
	const [onWindowFocused]         = useIpc(IpcChannel.Window_IsFocused);

	useEffect(() => {
		onWindowBlurred(() => {
			if (!windowPinned) {
				setIsBlurred(true);
			}
		});
		onWindowFocused(() => setIsBlurred(false));
	}, [windowPinned]);

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
	}, [currentDate, isBlurred]);

	return (
		<div className="space-x-3 w-full flex items-center">
			{!isFeatureEnabled('0196518a-ab04-74b7-b69f-98f85176382a') ? (
				<img ref={ref} src={logo} className={baseCss} draggable="false" width="32" height="32" {...props}/>
			) : (
				<img ref={ref} src={logoSrc} className={className} draggable="false" width="32" height="32" {...props}/>
			)}
			<span className="font-light">Yet Another YouTube Downloader</span>
		</div>
	)
});
