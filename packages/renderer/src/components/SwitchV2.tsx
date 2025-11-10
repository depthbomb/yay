import { useState, useContext, createContext } from 'react';
import type { Nullable } from 'shared';
import type { FC, ReactNode, ReactElement } from 'react';

type SwitchContextType = {
	checked: boolean;
	disabled: boolean;
	toggle: () => void;
};

const SwitchContext = createContext<Nullable<SwitchContextType>>(null);

export type SwitchRootProps = {
	checked?: boolean;
	defaultChecked?: boolean;
	onCheckedChange?: (checked: boolean) => void;
	disabled?: boolean;
	children: ReactNode;
	className?: string;
};

export const SwitchRoot: FC<SwitchRootProps> = ({
	checked: controlledChecked,
	defaultChecked = false,
	onCheckedChange,
	disabled = false,
	children,
	className = '',
}) => {
	const isControlled                          = typeof controlledChecked === 'boolean';
	const [internalChecked, setInternalChecked] = useState(defaultChecked);
	const checked                               = isControlled ? controlledChecked! : internalChecked;

	const toggle = () => {
		if (disabled) {
			return;
		}

		const next = !checked;

		if (!isControlled) {
			setInternalChecked(next);
		}

		onCheckedChange?.(next);
	};

	return (
		<SwitchContext.Provider value={{ checked, disabled, toggle }}>
			<button
				type="button"
				role="switch"
				disabled={disabled}
				onClick={toggle}
				className={className}
			>
				{children}
			</button>
		</SwitchContext.Provider>
	);
};

export type SwitchThumbProps = {
	className?: string;
};

export const SwitchThumb: FC<SwitchThumbProps> = ({ className = '' }) => {
	const ctx = useContext(SwitchContext);
	if (!ctx) {
		throw new Error('SwitchThumb must be used within a SwitchRoot');
	}

	return <span className={className}/>;
};

type SwitchProps = {
	checked?: boolean;
	defaultChecked?: boolean;
	onCheckedChange?: (checked: boolean) => void;
	label?: string | ReactElement;
	disabled?: boolean;
};

export const SwitchV2: FC<SwitchProps> = ({
	label,
	checked,
	defaultChecked,
	onCheckedChange,
	disabled,
}) => {
	return (
		<div className="flex items-center space-x-3">
			<SwitchRoot
				checked={checked}
				defaultChecked={defaultChecked}
				onCheckedChange={onCheckedChange}
				disabled={disabled}
				className={`relative inline-flex items-center h-6 w-12 rounded transition-colors duration-200 ${checked ? 'bg-lime-500' : 'bg-red-500'} ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
			>
				<SwitchThumb className={`size-5 block bg-white rounded shadow transition-transform duration-200 ease-in-out ${checked ? 'translate-x-6.5' : 'translate-x-0.5'}`}
				/>
			</SwitchRoot>
			{label && <span>{label}</span>}
		</div>
	);
};
