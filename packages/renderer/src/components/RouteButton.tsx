import { Button } from './Button';
import { useNavigate } from 'react-router';
import type { FC } from 'react';
import type { ButtonProps } from './Button';

type RouteButtonProps = Omit<ButtonProps, 'onClick'> & {
	to: string;
};

export const RouteButton: FC<RouteButtonProps> = ({ ...props }) => {
	const navigate = useNavigate();

	return (<Button onClick={() => navigate(props.to)} {...props}>{props.children}</Button>);
};
