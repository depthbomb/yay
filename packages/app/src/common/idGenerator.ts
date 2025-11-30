export class IDGenerator {
	private lastId: number;

	private readonly prefix: string;

	public constructor(prefix: string) {
		this.prefix = prefix;
		this.lastId = 0;
	}

	public nextId(): string {
		return this.prefix + (++this.lastId);
	}
}

export const defaultGenerator = new IDGenerator('id#');
