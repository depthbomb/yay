import { Button } from './Button';
import type { FC } from 'react';
import type { IButtonProps } from './Button';

export const PushButton: FC<Omit<IButtonProps, 'to'>> = ({ ...props }) => {
	return <Button {...props}>{props.children}</Button>;
};
