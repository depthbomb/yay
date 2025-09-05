export class Queue<T> {
	private items: T[] = [];

	public constructor(initial?: Iterable<T>) {
		if (initial) {
			this.items = [...initial];
		}
	}

	/**
	 * Get the number of items in the queue.
	 */
	public get size(): number {
		return this.items.length;
	}

	/**
	 * Check if the queue is empty.
	 */
	public get isEmpty(): boolean {
		return this.items.length === 0;
	}

	/**
	 * Add an item to the end of the queue.
	 *
	 * @param item Item to add to the end of the queue
	 */
	public enqueue(item: T): void {
		this.items.push(item);
	}

	/**
	 * Remove and return the item at the front of the queue.
	 *
	 * @returns The item at the front of the queue, or undefined if the queue is empty
	 */
	public dequeue(): T | undefined {
		return this.items.shift();
	}

	/**
	 * Return the item at the front of the queue without removing it.
	 *
	 * @returns The item at the front of the queue without removing it, or undefined if the queue is empty
	 */
	public peek(): T | undefined {
		return this.items[0];
	}

	/**
	 * Clear all items from the queue.
	 */
	public clear(): void {
		this.items = [];
	}

	/**
	 * Get an iterator for the items in the queue.
	 *
	 * @returns An iterator for the items in the queue
	 */
	public [Symbol.iterator](): Iterator<T> {
		return this.items[Symbol.iterator]();
	}

	/**
	 * Convert the queue to an array.
	 *
	 * @returns An array containing all items in the queue in order
	 */
	public toArray(): T[] {
		return [...this.items];
	}
}
