export class IDGenerator {
	private lastID: number;

	private readonly prefix: string;

	public constructor(prefix: string) {
		this.prefix = prefix;
		this.lastID = 0;
	}

	public nextID(): string {
		return this.prefix + (++this.lastID);
	}
}

export const defaultGenerator = new IDGenerator('id#');
