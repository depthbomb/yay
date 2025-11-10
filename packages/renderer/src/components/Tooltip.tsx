import { Tooltip as RTooltip } from 'radix-ui';
import type { FC } from 'react';

type TooltipProps = RTooltip.TooltipContentProps & {
	content: string;
};

export const Tooltip: FC<TooltipProps> = ({ children, content, ...props }) => {
	return (
		<RTooltip.Root>
			<RTooltip.Trigger asChild>
				{children}
			</RTooltip.Trigger>
			<RTooltip.Portal>
				<RTooltip.Content className="px-2 py-1 text-xs whitespace-nowrap bg-gray-900 rounded-sm pointer-events-none z-9001" {...props}>
					{content}
				</RTooltip.Content>
			</RTooltip.Portal>
		</RTooltip.Root>
	);
};
