import { Button } from './Button';
import { useNavigate } from 'react-router';
import type { FC } from 'react';
import type { IButtonProps } from './Button';

interface IRouteButtonProps extends  Omit<IButtonProps, 'onClick'> {
	to: string;
};

export const RouteButton: FC<IRouteButtonProps> = ({ ...props }) => {
	const navigate = useNavigate();

	return <Button onClick={() => navigate(props.to)} {...props}>{props.children}</Button>;
};
