import { Button } from './Button';
import type { FC } from 'react';
import type { IButtonProps } from './Button';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface IPushButtonProps extends Omit<IButtonProps, 'to'> {}

export const PushButton: FC<IPushButtonProps> = ({ ...props }) => {
	return <Button {...props}>{props.children}</Button>;
};
