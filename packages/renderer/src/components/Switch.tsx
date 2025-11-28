import { Root, Thumb } from '@radix-ui/react-switch';
import type { FC, ReactElement } from 'react';
import type { SwitchProps as RSwitchProps } from '@radix-ui/react-switch';

export interface ISwitchProps extends RSwitchProps {
	label?: string | ReactElement;
}

export const Switch: FC<ISwitchProps> = ({ label, checked, ...props }) => {
	return (
		<div className="space-x-3 flex items-center">
			<Root checked={checked} className="relative h-6 w-12 cursor-default rounded bg-red-500 outline-none data-[state=checked]:bg-lime-500 transition-colors" {...props}>
				<Thumb className="block size-5 translate-x-0.5 rounded bg-white transition-transform will-change-transform data-[state=checked]:translate-x-6.5" />
			</Root>
			{label && <span>{label}</span>}
		</div>
	);
};
