import { cva } from 'cva';
import type { FC } from 'react';
import type { VariantProps } from 'cva';

export interface ITitlebarButtonProps extends VariantProps<typeof titlebarButton> {
	onClick: () => void;
}

const titlebarButton = cva({
	base: 'text-center leading-8 shrink-0 w-[46px] h-8 text-gray-200 hover:text-white transition',
	variants: {
		type: {
			minimize: 'hover:bg-white/25',
			close: 'hover:bg-[#e81123]'
		}
	},
	defaultVariants: {
		type: 'minimize'
	}
});

export const TitlebarButton: FC<ITitlebarButtonProps> = ({ type, onClick }) => {
	return (
		<button className={titlebarButton({ type })} onClick={onClick} type="button">
			{type === 'minimize' ? (
				<svg className="inline-block size-4" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M14 8v1H3V8h11z"/></svg>
			) : (
				<svg className="inline-block size-4" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M7.116 8l-4.558 4.558.884.884L8 8.884l4.558 4.558.884-.884L8.884 8l4.558-4.558-.884-.884L8 7.116 3.442 2.558l-.884.884L7.116 8z"/></svg>
			)}
		</button>
	);
};
