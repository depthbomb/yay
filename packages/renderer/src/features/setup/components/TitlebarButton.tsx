import clsx from 'clsx';
import type { FC } from 'react';

type TitlebarButtonProps = {
	type: 'close' | 'minimize';
	onClick: () => void;
};

export const TitlebarButton: FC<TitlebarButtonProps> = ({ type, onClick }) => {
	const css = clsx(
		'text-center leading-8 shrink-0 w-[46px] h-[32px] text-gray-400 hover:text-white',
		{
			'hover:bg-white/25': type !== 'close',
			'hover:bg-[#e81123]': type === 'close'
		}
	);

	return (
		<button className={css} onClick={onClick} type="button">
			{type === 'minimize' ? (
				<svg className="inline-block size-4" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M14 8v1H3V8h11z"/></svg>
			) : (
				<svg className="inline-block size-4" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M7.116 8l-4.558 4.558.884.884L8 8.884l4.558 4.558.884-.884L8.884 8l4.558-4.558-.884-.884L8 7.116 3.442 2.558l-.884.884L7.116 8z"/></svg>
			)}
		</button>
	);
};
