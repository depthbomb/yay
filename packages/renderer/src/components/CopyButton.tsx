import { Button } from './Button';
import { Icon } from '@mdi/react';
import { mdiCheck, mdiContentCopy } from '@mdi/js';
import { useRef, useState, useEffect } from 'react';
import type { IButtonProps } from './Button';

export interface ICopyButtonProps extends Omit<IButtonProps, 'children' | 'onClick' | 'type'> {
	value: string;
}

export const CopyButton = ({ value, disabled, ...props }: ICopyButtonProps) => {
	const [copied, setCopied] = useState(false);
	const feedbackTimer       = useRef<number | null>(null);

	useEffect(() => {
		return () => {
			if (feedbackTimer.current !== null) {
				window.clearTimeout(feedbackTimer.current);
			}
		};
	}, []);

	const copy = async () => {
		await navigator.clipboard.writeText(value);
		setCopied(true);

		if (feedbackTimer.current !== null) {
			window.clearTimeout(feedbackTimer.current);
		}

		feedbackTimer.current = window.setTimeout(() => {
			setCopied(false);
			feedbackTimer.current = null;
		}, 2_000);
	};

	return (
		<Button
			{...props}
			type={copied ? 'success' : 'accent'}
			disabled={disabled || !value}
			onClick={() => void copy()}
		>
			<Icon path={copied ? mdiCheck : mdiContentCopy} className="size-4"/>
			<span>{copied ? 'Copied' : 'Copy'}</span>
		</Button>
	);
};
