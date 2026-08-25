import { useId, useState } from 'react';
import type { FC, ReactElement, InputHTMLAttributes } from 'react';

export interface ISwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'checked' | 'defaultChecked' | 'onChange' | 'type'> {
	checked?: boolean;
	defaultChecked?: boolean;
	label?: string | ReactElement;
	onCheckedChange?: (checked: boolean) => void;
	subtitle?: string;
}

export const Switch: FC<ISwitchProps> = ({ checked, className, defaultChecked = false, disabled, id, label, onCheckedChange, subtitle, ...props }) => {
	const generatedID = useId();
	const inputID = id ?? generatedID;
	const [internalChecked, setInternalChecked] = useState(defaultChecked);
	const active = checked ?? internalChecked;
	const state = active ? 'checked' : 'unchecked';

	return (
		<div className="space-y-1.5">
			<label htmlFor={inputID} className="space-x-3 flex items-center">
				<input
					id={inputID}
					type="checkbox"
					role="switch"
					className="peer sr-only"
					checked={active}
					disabled={disabled}
					onChange={event => {
						if (checked === undefined) setInternalChecked(event.currentTarget.checked);
						onCheckedChange?.(event.currentTarget.checked);
					}}
					{...props}
				/>
				<span
					aria-hidden="true"
					data-state={state}
					data-disabled={disabled ? '' : undefined}
					className={`relative h-6 w-12 shrink-0 cursor-pointer bg-gray-700 rounded-xs shadow outline-offset-2 outline-accent-500/50 transition-colors peer-focus:outline-2 peer-disabled:opacity-50 data-[state=checked]:bg-accent-500 ${className ?? ''}`}
				>
					<span data-state={state} className="block size-5 translate-x-0.75 translate-y-0.5 data-[state=unchecked]:bg-white data-[state=checked]:bg-accent-500-contrast rounded-xs shadow-xs transition-all will-change-transform data-[state=checked]:translate-x-6.25" />
				</span>
				{label && <span>{label}</span>}
			</label>
			{subtitle && <p className="text-xs">{subtitle}</p>}
		</div>
	);
};
