import { Button } from './Button';
import type { FC } from 'react';
import type { ButtonProps } from './Button';

type PushButtonProps = Omit<ButtonProps, 'to'>;

export const PushButton: FC<PushButtonProps> = ({ ...props }) => {
	return (<Button {...props}>{props.children}</Button>);
};
