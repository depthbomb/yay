import { cx } from 'cva';
import { createContext, useContext, useState, useMemo } from 'react';
import type { FC, ReactNode, HTMLAttributes } from 'react';


type TabsContextValue = {
	value: string;
	setValue: (v: string) => void;
	orientation: 'horizontal' | 'vertical';
};

const TabsContext = createContext<TabsContextValue | null>(null);

export type TabsRootProps = {
	defaultValue?: string;
	value?: string;
	onValueChange?: (value: string) => void;
	orientation?: 'horizontal' | 'vertical';
	children: ReactNode;
} & HTMLAttributes<HTMLDivElement>;

const Root: FC<TabsRootProps> = ({
	defaultValue,
	value: controlledValue,
	onValueChange,
	orientation = 'horizontal',
	children,
	className,
	...rest
}) => {
	const isControlled                      = typeof controlledValue === 'string';
	const [internalValue, setInternalValue] = useState(defaultValue || '');
	const currentValue                      = isControlled ? controlledValue! : internalValue;

	const setValue = (v: string) => {
		if (!isControlled) setInternalValue(v);
		onValueChange?.(v);
	};

	const ctx = useMemo(() => ({ value: currentValue, setValue, orientation }), [currentValue, orientation]);

	return (
		<TabsContext.Provider value={ctx}>
			<div
				className={cx('flex', orientation === 'vertical' ? 'flex-row' : 'flex-col', className)}
				{...rest}
			>
				{children}
			</div>
		</TabsContext.Provider>
	);
};

export type TabsListProps = {
	children: ReactNode;
} & HTMLAttributes<HTMLDivElement>;

const List: FC<TabsListProps> = ({ children, className, ...rest }) => {
	const ctx = useContext(TabsContext);
	if (!ctx) throw new Error('Tabs.List must be used inside Tabs.Root');

	return (
		<div
			className={cx('inline-flex', ctx.orientation === 'vertical' ? 'flex-col' : 'flex-row', className)}
			{...rest}
			role="tablist"
		>
			{children}
		</div>
	);
};

export type TabsTriggerProps = {
	value: string;
	children: ReactNode;
	className?: (isActive: boolean) => string;
} & Omit<HTMLAttributes<HTMLButtonElement>, 'className'>;

const Trigger: FC<TabsTriggerProps> = ({ value, children, className, ...rest }) => {
	const ctx = useContext(TabsContext);
	if (!ctx) {
		throw new Error('Tabs.Trigger must be used inside Tabs.Root');
	}

	const isActive          = ctx.value === value;
	const computedClassName = typeof className === 'function' ? className(isActive) : className;

	return (
		<button
			onClick={() => ctx.setValue(value)}
			className={computedClassName}
			{...rest}
			role="tab"
		>
			{children}
		</button>
	);
};

export type TabsContentProps = {
	value: string;
	children: ReactNode;
} & HTMLAttributes<HTMLDivElement>;

const Content: FC<TabsContentProps> = ({ value, children, className, ...rest }) => {
	const ctx = useContext(TabsContext);
	if (!ctx) {
		throw new Error('Tabs.Content must be used inside Tabs.Root');
	}

	const isActive = ctx.value === value;
	if (!isActive) {
		return null;
	}

	return (
		<div className={cx(className)} {...rest} role="tabpanel">
			{children}
		</div>
	);
};

export const TabsV2 = {
	Root,
	List,
	Trigger,
	Content,
};

export default TabsV2;
