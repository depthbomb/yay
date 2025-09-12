import { EventEmitter } from 'node:events';

export type CancellationTokenOptions = {
	timeout?: number;
	signal?: AbortSignal;
	parent?: CancellationToken;
};

export type CancellationTokenRegistration = {
	readonly token: CancellationToken;
	unregister(): void;
};

export type CancellationCallback = {
	(token: CancellationToken): void;
};

export type AsyncCancellationCallback = {
	(token: CancellationToken): Promise<void>;
};

export class OperationCancelledError extends Error {
	public readonly token: CancellationToken;

	constructor(message: string = 'Operation was cancelled', token?: CancellationToken) {
		super(message);
		this.name = 'OperationCancelledError';
		this.token = token!;
	}
}

export class TimeoutError extends OperationCancelledError {
	constructor(timeout: number, token?: CancellationToken) {
		super(`Operation timed out after ${timeout}ms`, token);
		this.name = 'TimeoutError';
	}
}

class TokenRegistration implements CancellationTokenRegistration {
	private isUnregistered = false;

	constructor(
		public readonly token: CancellationToken,
		private readonly callback: CancellationCallback | AsyncCancellationCallback,
		private readonly emitter: EventEmitter,
		private readonly isAsync: boolean = false
	) {
		if (isAsync) {
			this.emitter.on('cancelled', this.asyncHandler);
		} else {
			this.emitter.on('cancelled', this.syncHandler);
		}
	}

	private syncHandler = (token: CancellationToken) => {
		if (!this.isUnregistered && !this.isAsync) {
			(this.callback as CancellationCallback)(token);
		}
	};

	private asyncHandler = async (token: CancellationToken) => {
		if (!this.isUnregistered && this.isAsync) {
			try {
				await (this.callback as AsyncCancellationCallback)(token);
			} catch (error) {
				console.error('Error in async cancellation callback:', error);
			}
		}
	};

	unregister(): void {
		if (this.isUnregistered) return;

		this.isUnregistered = true;
		this.emitter.removeListener('cancelled', this.syncHandler);
		this.emitter.removeListener('cancelled', this.asyncHandler);
	}
}

export class CancellationToken extends EventEmitter {
	public cancellationReason?: string;
	public cancellationTime?: Date;

	private isCancelled = false;
	private registrations = new Set<TokenRegistration>();
	private children = new Set<CancellationToken>();
	private parent?: CancellationToken;
	private timeoutId?: NodeJS.Timeout;
	private abortController?: AbortController;

	public static readonly None = new CancellationToken();
	public static readonly Cancelled = (() => {
		const token = new CancellationToken();
		token.cancel('Pre-cancelled token');
		return token;
	})();

	constructor(options: CancellationTokenOptions = {}) {
		super();

		if (options.parent) {
			this.parent = options.parent;
			options.parent.children.add(this);

			if (options.parent.isCancellationRequested) {
				this.cancel(options.parent.cancellationReason);
			} else {
				options.parent.register(() => this.cancel('Parent token cancelled'));
			}
		}

		if (options.timeout && options.timeout > 0) {
			this.timeoutId = setTimeout(() => {
				this.cancel(`Operation timed out after ${options.timeout}ms`);
			}, options.timeout);
		}

		if (options.signal) {
			if (options.signal.aborted) {
				this.cancel('AbortSignal was already aborted');
			} else {
				options.signal.addEventListener('abort', () => {
					this.cancel('AbortSignal was aborted');
				});
			}
		}
	}

	public get isCancellationRequested(): boolean {
		return this.isCancelled;
	}

	public get canBeCancelled(): boolean {
		return true;
	}

	public get hasParent(): boolean {
		return this.parent !== undefined;
	}

	public get parentToken(): CancellationToken | undefined {
		return this.parent;
	}

	public get childrenCount(): number {
		return this.children.size;
	}

	public get registrationCount(): number {
		return this.registrations.size;
	}

	public throwIfCancellationRequested(message?: string): void {
		if (this.isCancelled) {
			throw new OperationCancelledError(
				message || this.cancellationReason || 'Operation was cancelled',
				this
			);
		}
	}

	public register(callback: CancellationCallback): CancellationTokenRegistration {
		if (this.isCancelled) {
			setImmediate(() => callback(this));
		}

		const registration = new TokenRegistration(this, callback, this);
		this.registrations.add(registration);
		return registration;
	}

	public registerAsync(callback: AsyncCancellationCallback): CancellationTokenRegistration {
		if (this.isCancelled) {
			setImmediate(async () => {
				try {
					await callback(this);
				} catch (error) {
					console.error('Error in immediate async cancellation callback:', error);
				}
			});
		}

		const registration = new TokenRegistration(this, callback, this, true);
		this.registrations.add(registration);
		return registration;
	}

	public cancel(reason?: string): void {
		if (this.isCancelled) return;

		this.isCancelled = true;
		this.cancellationReason = reason || 'Operation was cancelled';
		this.cancellationTime = new Date();

		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = undefined;
		}

		for (const child of this.children) {
			child.cancel('Parent token cancelled');
		}

		this.emit('cancelled', this);

		for (const registration of this.registrations) {
			registration.unregister();
		}

		this.registrations.clear();
	}

	public createLinkedToken(options: Omit<CancellationTokenOptions, 'parent'> = {}): CancellationToken {
		return new CancellationToken({ ...options, parent: this });
	}

	public waitForCancellation(): Promise<void> {
		if (this.isCancelled) return Promise.resolve();

		return new Promise<void>((resolve) => {
			this.register(() => resolve());
		});
	}

	public race<T>(promise: Promise<T>): Promise<T> {
		if (this.isCancelled) {
			return Promise.reject(new OperationCancelledError(this.cancellationReason, this));
		}

		return new Promise<T>((resolve, reject) => {
			const registration = this.register((token) => {
				reject(new OperationCancelledError(token.cancellationReason, token));
			});

			promise
				.then((result) => {
					registration.unregister();
					resolve(result);
				})
				.catch((error) => {
					registration.unregister();
					reject(error);
				});
		});
	}

	public delay(ms: number): Promise<void> {
		return this.race(new Promise<void>((resolve) => setTimeout(resolve, ms)));
	}

	public toAbortSignal(): AbortSignal {
		if (!this.abortController) {
			this.abortController = new AbortController();

			if (this.isCancelled) {
				this.abortController.abort();
			} else {
				this.register(() => this.abortController!.abort());
			}
		}

		return this.abortController.signal;
	}

	public dispose(): void {
		this.cancel('Token disposed');
		this.removeAllListeners();

		if (this.parent) {
			this.parent.children.delete(this);
		}
	}

	public override toString(): string {
		const status = this.isCancelled ? 'Cancelled' : 'Active';
		const reason = this.cancellationReason ? ` (${this.cancellationReason})` : '';
		const time = this.cancellationTime ? ` at ${this.cancellationTime.toISOString()}` : '';
		return `CancellationToken[${status}${reason}${time}]`;
	}

	public toJSON() {
		return {
			isCancellationRequested: this.isCancelled,
			cancellationReason: this.cancellationReason,
			cancellationTime: this.cancellationTime?.toISOString(),
			hasParent: this.hasParent,
			childrenCount: this.childrenCount,
			registrationCount: this.registrationCount,
		};
	}
}

export class CancellationTokenSource {
	private tokenInstance: CancellationToken;
	private isDisposed = false;

	constructor(options: CancellationTokenOptions = {}) {
		this.tokenInstance = new CancellationToken(options);
	}

	public get token(): CancellationToken {
		this.throwIfDisposed();
		return this.tokenInstance;
	}

	public get isCancellationRequested(): boolean {
		return this.tokenInstance.isCancellationRequested;
	}

	public cancel(reason?: string): void {
		this.throwIfDisposed();
		this.tokenInstance.cancel(reason);
	}

	public cancelAfter(delay: number, reason?: string): void {
		this.throwIfDisposed();
		setTimeout(() => {
			if (!this.isDisposed && !this.tokenInstance.isCancellationRequested) {
				this.cancel(reason || `Cancelled after ${delay}ms delay`);
			}
		}, delay);
	}

	public dispose(): void {
		if (this.isDisposed) return;

		this.isDisposed = true;
		this.tokenInstance.dispose();
	}

	private throwIfDisposed(): void {
		if (this.isDisposed) throw new Error('CancellationTokenSource has been disposed');
	}

	public static createLinkedTokenSource(...tokens: CancellationToken[]): CancellationTokenSource {
		const source = new CancellationTokenSource();

		for (const token of tokens) {
			if (token.isCancellationRequested) {
				source.cancel('Linked token was already cancelled');
				break;
			} else {
				token.register((cancelledToken) => {
					source.cancel(`Linked token cancelled: ${cancelledToken.cancellationReason}`);
				});
			}
		}

		return source;
	}

	public static createWithTimeout(timeout: number): CancellationTokenSource {
		return new CancellationTokenSource({ timeout });
	}

	public static createWithAbortSignal(signal: AbortSignal): CancellationTokenSource {
		return new CancellationTokenSource({ signal });
	}
}

export namespace CancellationTokenUtils {
	export function combineTokens(...tokens: CancellationToken[]): CancellationToken {
		if (tokens.length === 0) return CancellationToken.None;
		if (tokens.length === 1) return tokens[0];

		const source = CancellationTokenSource.createLinkedTokenSource(...tokens);
		return source.token;
	}

	export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, token?: CancellationToken): Promise<T> {
		const timeoutSource = new CancellationTokenSource({ timeout: timeoutMs });
		const combinedToken = token ? combineTokens(token, timeoutSource.token) : timeoutSource.token;

		return combinedToken.race(promise).finally(() => timeoutSource.dispose());
	}

	export function cancellable<T extends any[], R>(fn: (...args: [...T, CancellationToken]) => Promise<R>) {
		return (...args: T) => {
			const token = (args[args.length - 1] as CancellationToken) || CancellationToken.None;
			return fn(...args, token);
		};
	}

	export function promisifyWithCancellation<T extends any[], R>(
		fn: (...args: [...T, (error: any, result?: R) => void]) => void
	): (...args: [...T, CancellationToken?]) => Promise<R> {
		return (...args) => {
			const token = args[args.length - 1] as CancellationToken;
			const fnArgs = token instanceof CancellationToken ? args.slice(0, -1) as T : args as unknown as T;
			const cancellationToken = token instanceof CancellationToken ? token : CancellationToken.None;

			return new Promise<R>((resolve, reject) => {
				const registration = cancellationToken.register((cancelToken) => {
					reject(new OperationCancelledError(cancelToken.cancellationReason, cancelToken));
				});

				try {
					fn(...fnArgs, (error: any, result?: R) => {
						registration.unregister();
						if (error) reject(error);
						else resolve(result!);
					});
				} catch (error) {
					registration.unregister();
					reject(error);
				}
			});
		};
	}
}

export class CancellableOperation<T = any> {
	private source: CancellationTokenSource;
	private promise: Promise<T>;
	private isCompleted = false;

	constructor(operation: (token: CancellationToken) => Promise<T>, options: CancellationTokenOptions = {}) {
		this.source = new CancellationTokenSource(options);
		this.promise = this.executeOperation(operation);
	}

	public get token(): CancellationToken {
		return this.source.token;
	}

	public get isCompletedOperation(): boolean {
		return this.isCompleted;
	}

	public get isCancelled(): boolean {
		return this.source.isCancellationRequested;
	}

	private async executeOperation(operation: (token: CancellationToken) => Promise<T>): Promise<T> {
		try {
			const result = await this.source.token.race(operation(this.source.token));
			this.isCompleted = true;
			return result;
		} catch (error) {
			this.isCompleted = true;
			throw error;
		} finally {
			this.source.dispose();
		}
	}

	public cancel(reason?: string): void {
		this.source.cancel(reason);
	}

	public async waitForCompletion(): Promise<T> {
		return this.promise;
	}
}

export default {
	CancellationToken,
	CancellationTokenSource,
	CancellationTokenUtils,
	CancellableOperation,
	OperationCancelledError,
	TimeoutError,
};
