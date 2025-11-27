import DOMPurify from 'dompurify';
import type { FC } from 'react';

export interface IHTMLProps {
	html: string;
};

export const HTML: FC<IHTMLProps> = ({ html }) => {
	return (
		<div
			className="
				prose
				prose-li:text-white
				prose-headings:text-white
				prose-strong:text-white
				prose-a:text-brand-500
				prose-a:hover:text-brand-400
				prose-a:active:text-brand-600
			"
			dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
		/>
	);
};
