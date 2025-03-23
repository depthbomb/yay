import type { Nullable } from 'shared';

export class NotificationBuilder {
	private title: string = '';
	private text: string[] = [];
	private image: Nullable<{ url: string; placement: string; }> = null;
	private audio: Nullable<{ src: Nullable<string>; loop: Nullable<boolean>; silent: Nullable<boolean> }> = null;
	private actions: Array<{ content: string; activationType: string; args: string }> = [];
	private launch: string = '';
	private scenario: Nullable<string> = null;

	public setTitle(title: string) {
		this.title = title;

		return this;
	}

	public addText(text: string) {
		if (this.text.length < 3) {
			this.text.push(text);
		}

		return this;
	}

	public setImage(url: string, placement: string,) {
		this.image = { url, placement };

		return this;
	}

	public setAudio(src: Nullable<string> = null, loop: boolean = false, silent: boolean = false) {
		this.audio = { src, loop, silent };

		return this;
	}

	public addAction(content: string, args: string, activationType: string = 'foreground') {
		this.actions.push({ content, args, activationType });

		return this;
	}

	public setLaunch(launch: string) {
		this.launch = launch;

		return this;
	}

	public setScenario(scenario: string) {
		this.scenario = scenario;

		return this;
	}

	public build(): string {
		let xml = '<toast';

		if (this.launch) {
			xml += ` launch="${this.escape(this.launch)}"`;
		}

		if (this.scenario) {
			xml += ` scenario="${this.scenario}"`;
		}

		xml += '>\n';
		xml += '	<visual>\n';
		xml += '		<binding template="ToastGeneric">\n';

		if (this.image) {
			xml += `			<image placement="${this.image.placement}" src="${this.escape(this.image.url)}"/>\n`;
		}

		if (this.title) {
			xml += `			<text>${this.escape(this.title)}</text>\n`;
		}

		for (const line of this.text) {
			xml += `			<text>${this.escape(line)}</text>\n`;
		}

		xml += '		</binding>\n';
		xml += '	</visual>\n';

		if (this.actions.length > 0) {
			xml += '	<actions>\n';

			for (const action of this.actions) {
				xml += `		<action content="${this.escape(action.content)}" arguments="${this.escape(action.args)}" activationType="${action.activationType}"/>\n`;
			}

			xml += '	</actions>\n';
		}

		if (this.audio) {
			if (this.audio.silent) {
				xml += '	<audio silent="true"/>\n';
			} else {
				xml += '	<audio';
				xml += ` src="${this.audio.src}"`;
				xml += ` loop="${!!this.audio.loop}"`;
				xml += '/>\n';
			}
		}

		xml += '</toast>';

		return xml;
	}

	private escape(str: string): string {
		return str
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&apos;');
	}
}
