import { Root, Thumb } from '@radix-ui/react-switch';
import type { FC, ReactElement } from 'react';
import type { SwitchProps as RSwitchProps } from '@radix-ui/react-switch';

export interface ISwitchProps extends RSwitchProps {
	label?: string | ReactElement;
	subtitle?: string;
}

export const Switch: FC<ISwitchProps> = ({ label, subtitle, checked, ...props }) => {
	return (
		<div className="space-y-1.5">
			<div className="space-x-3 flex items-center">
				<Root checked={checked} className="relative h-6 w-12 cursor-default bg-gray-700 rounded-xs shadow outline-offset-2 outline-accent-500/50 transition-colors focus:outline-2 data-[state=checked]:bg-accent-500" {...props}>
					<Thumb className="block size-5 translate-x-0.75 data-[state=unchecked]:bg-white data-[state=checked]:bg-accent-500-contrast rounded-xs shadow-xs transition-all will-change-transform data-[state=checked]:translate-x-6.25" />
				</Root>
				{label && <span>{label}</span>}
			</div>
			{subtitle && <p className="text-xs">{subtitle}</p>}
		</div>
	);
};
