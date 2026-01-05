export class TransformableNumber {
	public constructor(
		private initial: number,
		private readonly transformFn = (x: number) => x
	) {}

	public get value() {
		const number = this.initial;

		this.initial = this.transformFn(this.initial);

		return number;
	}

	public static create(initial: number, transformFn = (x: number) => x) {
		return new this(initial, transformFn);
	}
}
