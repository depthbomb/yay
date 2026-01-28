export class Flag {
	public value: boolean;
	readonly #initialValue: boolean;

	public constructor(value: boolean = false) {
		this.value        = value;
		this.#initialValue = value;
	}

	public get isTrue() {
		return this.value === true;
	}

	public get isFalse() {
		return !this.isTrue;
	}

	public set(value: boolean) {
		this.value = value;
	}

	public setTrue() {
		this.value = true;
	}

	public setFalse() {
		this.value = false;
	}

	public toggle() {
		this.value = !this.value;
	}

	public reset() {
		this.value = this.#initialValue;
	}

	public valueOf() {
		return this.value;
	}

	public toString() {
		return String(this.value);
	}
}
