import { cva } from 'cva';
import type { VariantProps } from 'cva';
import type { FC, ButtonHTMLAttributes } from 'react';

export interface IGlobalMenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof globalMenuItem> {
	text: string;
	icon: string;
}

const globalMenuItem = cva({
	base: 'py-2 px-3 space-x-2 flex items-center text-gray-300 transition',
	variants: {
		disabled: {
			false: 'hover:text-white hover:bg-white/10',
			true: 'opacity-50 cursor-not-allowed!',
		}
	},
	defaultVariants: {
		disabled: false,
	}
});

export const GlobalMenuItem: FC<IGlobalMenuItemProps> = ({ text, icon, onClick, disabled }) => {
	return (
		<button className={globalMenuItem({ disabled })} onClick={onClick} disabled={disabled} type="button">
			<img src={icon} className="size-4" width="16" height="16"/>
			<span className="text-sm">{text}</span>
		</button>
	);
};
