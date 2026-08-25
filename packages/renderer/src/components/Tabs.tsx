import { createContext, useContext, useId, useState } from 'react';
import type { FC, HTMLAttributes, KeyboardEvent, ButtonHTMLAttributes, ReactNode } from 'react';

type TabsOrientation = 'horizontal' | 'vertical';

interface ITabsContext {
	activeValue: string;
	baseID: string;
	orientation: TabsOrientation;
	setActiveValue: (value: string) => void;
}

export interface ITabsRootProps extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
	children?: ReactNode;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	orientation?: TabsOrientation;
	value?: string;
}

export type TabsListProps = HTMLAttributes<HTMLDivElement>;

export interface TabsTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	value: string;
}

export interface ITabsContentProps extends HTMLAttributes<HTMLDivElement> {
	value: string;
}

const TabsContext = createContext<ITabsContext | null>(null);

const useTabs = () => {
	const context = useContext(TabsContext);
	if (!context) {
		throw new Error('Tabs components must be rendered inside Tabs.Root');
	}
	return context;
};

const getTriggerID = (baseID: string, value: string) => `${baseID}-trigger-${encodeURIComponent(value)}`;
const getContentID = (baseID: string, value: string) => `${baseID}-content-${encodeURIComponent(value)}`;

export const Root: FC<ITabsRootProps> = ({
	children,
	defaultValue = '',
	onValueChange,
	orientation = 'horizontal',
	value,
	...props
}) => {
	const baseID = useId();
	const [internalValue, setInternalValue] = useState(defaultValue);
	const activeValue = value ?? internalValue;

	const setActiveValue = (nextValue: string) => {
		if (nextValue === activeValue) {
			return;
		}
		if (value === undefined) {
			setInternalValue(nextValue);
		}
		onValueChange?.(nextValue);
	};

	return (
		<TabsContext.Provider value={{ activeValue, baseID, orientation, setActiveValue }}>
			<div data-orientation={orientation} {...props}>{children}</div>
		</TabsContext.Provider>
	);
};

export const List: FC<TabsListProps> = props => {
	const { orientation } = useTabs();
	return <div role="tablist" aria-orientation={orientation} data-orientation={orientation} {...props}/>;
};

const focusAdjacentTrigger = (event: KeyboardEvent<HTMLButtonElement>, orientation: TabsOrientation) => {
	const tabList = event.currentTarget.closest('[role="tablist"]');
	const triggers = tabList
		? Array.from(tabList.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'))
		: [];
	if (triggers.length === 0) {
		return;
	}

	const currentIndex = triggers.indexOf(event.currentTarget);
	let nextIndex: number | undefined;
	switch (event.key) {
		case 'Home':
			nextIndex = 0;
			break;
		case 'End':
			nextIndex = triggers.length - 1;
			break;
		case 'ArrowLeft':
			if (orientation === 'horizontal') nextIndex = (currentIndex - 1 + triggers.length) % triggers.length;
			break;
		case 'ArrowRight':
			if (orientation === 'horizontal') nextIndex = (currentIndex + 1) % triggers.length;
			break;
		case 'ArrowUp':
			if (orientation === 'vertical') nextIndex = (currentIndex - 1 + triggers.length) % triggers.length;
			break;
		case 'ArrowDown':
			if (orientation === 'vertical') nextIndex = (currentIndex + 1) % triggers.length;
			break;
	}

	if (nextIndex !== undefined) {
		event.preventDefault();
		triggers[nextIndex]?.focus();
		triggers[nextIndex]?.click();
	}
};

export const Trigger: FC<TabsTriggerProps> = ({ disabled, onClick, onKeyDown, value, ...props }) => {
	const { activeValue, baseID, orientation, setActiveValue } = useTabs();
	const active = activeValue === value;

	return (
		<button
			type="button"
			role="tab"
			id={getTriggerID(baseID, value)}
			aria-controls={getContentID(baseID, value)}
			aria-selected={active}
			data-orientation={orientation}
			data-state={active ? 'active' : 'inactive'}
			disabled={disabled}
			tabIndex={active ? 0 : -1}
			onClick={event => {
				onClick?.(event);
				if (!event.defaultPrevented) setActiveValue(value);
			}}
			onKeyDown={event => {
				onKeyDown?.(event);
				if (!event.defaultPrevented) focusAdjacentTrigger(event, orientation);
			}}
			{...props}
		/>
	);
};

export const Content: FC<ITabsContentProps> = ({ children, value, ...props }) => {
	const { activeValue, baseID, orientation } = useTabs();
	if (activeValue !== value) {
		return null;
	}

	return (
		<div
			role="tabpanel"
			id={getContentID(baseID, value)}
			aria-labelledby={getTriggerID(baseID, value)}
			data-orientation={orientation}
			data-state="active"
			tabIndex={0}
			{...props}
		>
			{children}
		</div>
	);
};
