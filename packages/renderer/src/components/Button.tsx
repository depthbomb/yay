import { cva } from 'cva';
import type { VariantProps } from 'cva';
import type { FC, ButtonHTMLAttributes } from 'react';

export interface IButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'>, VariantProps<typeof button> {
	progress?: number;
}

const button = cva({
	base: 'relative inline shrink-0 shadow outline-offset-2 focus:outline-2 transition-[color,background-color]',
	variants: {
		type: {
			accent: 'text-accent-500-contrast bg-accent-500 outline-accent-500/50 hover:bg-accent-600 active:bg-accent-700',
			success: 'text-black bg-lime-500 outline-lime-500/50 hover:bg-lime-600 active:bg-lime-700',
			warning: 'text-white bg-orange-500 outline-orange-500/50 hover:bg-orange-600 active:bg-orange-700',
			danger: 'text-white bg-red-500 outline-red-500/50 hover:bg-red-600 active:bg-red-700',
			info: 'text-black bg-cyan-500 outline-cyan-500/50 hover:bg-cyan-600 active:bg-cyan-700',
			twitter: 'text-white bg-[#55acee] outline-[#55acee]/50 hover:bg-[#1b88dc] active:bg-[#0d5597]'
		},
		size: {
			sm: 'px-1.75 h-5 rounded-[3px]',
			default: 'px-2.5 h-6 rounded',
			lg: 'px-2.75 h-8 rounded',
			xl: 'px-3.5 h-8.5 rounded'
		},
		disabled: {
			false: 'cursor-pointer',
			true: 'opacity-50 cursor-not-allowed!'
		}
	},
	defaultVariants: {
		type: 'accent',
		size: 'default'
	}
});

const inner = cva({
	base: 'relative flex items-center justify-center z-10',
	variants: {
		size: {
			sm: 'space-x-0.5 text-[10px]',
			default: 'space-x-1 h-6 text-xs',
			lg: 'space-x-1 text-sm',
			xl: 'space-x-1.5 text-lg'
		},
	},
	defaultVariants: {
		size: 'default'
	}
});

export const Button: FC<IButtonProps> = ({ type, size, progress = 0, className, disabled, ...props }) => {
	return (
		<button
			className={button({ type, size, disabled, className })}
			disabled={disabled}
			{...props}
			type="button"
		>
			<span className={inner({ size })}>{props.children}</span>

			{progress > 0 && (
				<span className="absolute inset-x-0 bottom-0 h-1 bg-black/20 rounded-b overflow-hidden">
					<span className="block h-full bg-lime-500 transition-[width]" style={{ width: `${progress}%` }}/>
				</span>
			)}
		</button>
	);
};
