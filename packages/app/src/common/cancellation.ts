import { EventEmitter } from 'node:events';

export interface CancellationTokenOptions {
	timeout?: number;
	signal?: AbortSignal;
	parent?: CancellationToken;
}

export interface CancellationTokenRegistration {
	readonly token: CancellationToken;
	unregister(): void;
}

export interface CancellationCallback {
	(token: CancellationToken): void;
}

export interface AsyncCancellationCallback {
	(token: CancellationToken): Promise<void>;
}

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
	private _isUnregistered = false;

	constructor(
		public readonly token: CancellationToken,
		private readonly _callback: CancellationCallback | AsyncCancellationCallback,
		private readonly _emitter: EventEmitter,
		private readonly _isAsync: boolean = false
	) {
		if (_isAsync) {
			this._emitter.on('cancelled', this._asyncHandler);
		} else {
			this._emitter.on('cancelled', this._syncHandler);
		}
	}

	private _syncHandler = (token: CancellationToken) => {
		if (!this._isUnregistered && !this._isAsync) {
			(this._callback as CancellationCallback)(token);
		}
	};

	private _asyncHandler = async (token: CancellationToken) => {
		if (!this._isUnregistered && this._isAsync) {
			try {
				await (this._callback as AsyncCancellationCallback)(token);
			} catch (error) {
				console.error('Error in async cancellation callback:', error);
			}
		}
	};

	unregister(): void {
		if (this._isUnregistered) {
			return;
		}

		this._isUnregistered = true;
		this._emitter.removeListener('cancelled', this._syncHandler);
		this._emitter.removeListener('cancelled', this._asyncHandler);
	}
}

export class CancellationToken extends EventEmitter {
	private _isCancelled = false;
	private _cancellationReason?: string;
	private _cancellationTime?: Date;
	private _registrations = new Set<TokenRegistration>();
	private _children = new Set<CancellationToken>();
	private _parent?: CancellationToken;
	private _timeoutId?: NodeJS.Timeout;
	private _abortController?: AbortController;

	public static readonly None = new CancellationToken();
	public static readonly Cancelled = (() => {
		const token = new CancellationToken();
		token.cancel('Pre-cancelled token');

		return token;
	})();

	constructor(options: CancellationTokenOptions = {}) {
		super();

		if (options.parent) {
			this._parent = options.parent;
			options.parent._children.add(this);

			if (options.parent.isCancellationRequested) {
				this.cancel(options.parent.cancellationReason);
			} else {
				options.parent.register(() => {
					this.cancel('Parent token cancelled');
				});
			}
		}

		if (options.timeout && options.timeout > 0) {
			this._timeoutId = setTimeout(() => {
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
		return this._isCancelled;
	}

	public get canBeCancelled(): boolean {
		return true;
	}

	public get cancellationReason(): string | undefined {
		return this._cancellationReason;
	}

	public get cancellationTime(): Date | undefined {
		return this._cancellationTime;
	}

	public get hasParent(): boolean {
		return this._parent !== undefined;
	}

	public get parent(): CancellationToken | undefined {
		return this._parent;
	}

	public get childrenCount(): number {
		return this._children.size;
	}

	public get registrationCount(): number {
		return this._registrations.size;
	}

	public throwIfCancellationRequested(message?: string): void {
		if (this._isCancelled) {
			throw new OperationCancelledError(
				message || this._cancellationReason || 'Operation was cancelled',
				this
			);
		}
	}

	public register(callback: CancellationCallback): CancellationTokenRegistration {
		if (this._isCancelled) {
			setImmediate(() => callback(this));
		}

		const registration = new TokenRegistration(this, callback, this);

		this._registrations.add(registration);

		return registration;
	}

	public registerAsync(callback: AsyncCancellationCallback): CancellationTokenRegistration {
		if (this._isCancelled) {
			setImmediate(async () => {
				try {
					await callback(this);
				} catch (error) {
					console.error('Error in immediate async cancellation callback:', error);
				}
			});
		}

		const registration = new TokenRegistration(this, callback, this, true);

		this._registrations.add(registration);

		return registration;
	}

	public cancel(reason?: string): void {
		if (this._isCancelled) {
			return;
		}

		this._isCancelled = true;
		this._cancellationReason = reason || 'Operation was cancelled';
		this._cancellationTime = new Date();

		if (this._timeoutId) {
			clearTimeout(this._timeoutId);
			this._timeoutId = undefined;
		}

		for (const child of this._children) {
			child.cancel('Parent token cancelled');
		}

		this.emit('cancelled', this);

		for (const registration of this._registrations) {
			registration.unregister();
		}

		this._registrations.clear();
	}

	public createLinkedToken(options: Omit<CancellationTokenOptions, 'parent'> = {}): CancellationToken {
		return new CancellationToken({ ...options, parent: this });
	}

	public waitForCancellation(): Promise<void> {
		if (this._isCancelled) {
			return Promise.resolve();
		}

		return new Promise<void>((resolve) => {
			const registration = this.register(() => resolve());
		});
	}

	public race<T>(promise: Promise<T>): Promise<T> {
		if (this._isCancelled) {
			return Promise.reject(new OperationCancelledError(this._cancellationReason, this));
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
		return this.race(new Promise<void>(resolve => setTimeout(resolve, ms)));
	}

	public toAbortSignal(): AbortSignal {
		if (!this._abortController) {
			this._abortController = new AbortController();

			if (this._isCancelled) {
				this._abortController.abort();
			} else {
				this.register(() => {
					this._abortController!.abort();
				});
			}
		}

		return this._abortController.signal;
	}

	public dispose(): void {
		this.cancel('Token disposed');
		this.removeAllListeners();

		if (this._parent) {
			this._parent._children.delete(this);
		}
	}

	public override toString(): string {
		const status = this._isCancelled ? 'Cancelled' : 'Active';
		const reason = this._cancellationReason ? ` (${this._cancellationReason})` : '';
		const time = this._cancellationTime ? ` at ${this._cancellationTime.toISOString()}` : '';

		return `CancellationToken[${status}${reason}${time}]`;
	}

	public toJSON() {
		return {
			isCancellationRequested: this._isCancelled,
			cancellationReason: this._cancellationReason,
			cancellationTime: this._cancellationTime?.toISOString(),
			hasParent: this.hasParent,
			childrenCount: this.childrenCount,
			registrationCount: this.registrationCount
		};
	}
}

export class CancellationTokenSource {
	private _token: CancellationToken;
	private _isDisposed = false;

	constructor(options: CancellationTokenOptions = {}) {
		this._token = new CancellationToken(options);
	}

	public get token(): CancellationToken {
		this.throwIfDisposed();
		return this._token;
	}

	public get isCancellationRequested(): boolean {
		return this._token.isCancellationRequested;
	}

	public cancel(reason?: string): void {
		this.throwIfDisposed();
		this._token.cancel(reason);
	}

	public cancelAfter(delay: number, reason?: string): void {
		this.throwIfDisposed();
		setTimeout(() => {
			if (!this._isDisposed && !this._token.isCancellationRequested) {
				this.cancel(reason || `Cancelled after ${delay}ms delay`);
			}
		}, delay);
	}

	public dispose(): void {
		if (this._isDisposed) {
			return;
		}

		this._isDisposed = true;
		this._token.dispose();
	}

	private throwIfDisposed(): void {
		if (this._isDisposed) {
			throw new Error('CancellationTokenSource has been disposed');
		}
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
		const combinedToken = token
			? combineTokens(token, timeoutSource.token)
			: timeoutSource.token;

		return combinedToken.race(promise).finally(() => {
			timeoutSource.dispose();
		});
	}

	export function cancellable<T extends any[], R>(fn: (...args: [...T, CancellationToken]) => Promise<R>) {
		return (...args: T) => {
			const token = args[args.length - 1] as CancellationToken || CancellationToken.None;
			return fn(...args, token);
		};
	}

	export function promisifyWithCancellation<T extends any[], R>(fn: (...args: [...T, (error: any, result?: R) => void]) => void): (...args: [...T, CancellationToken?]) => Promise<R> {
		return (...args) => {
			const token = args[args.length - 1] as CancellationToken;
			const fnArgs = token instanceof CancellationToken
				? args.slice(0, -1) as T
				: args as unknown as T;
			const cancellationToken = token instanceof CancellationToken
				? token
				: CancellationToken.None;

			return new Promise<R>((resolve, reject) => {
				const registration = cancellationToken.register((cancelToken) => {
					reject(new OperationCancelledError(cancelToken.cancellationReason, cancelToken));
				});

				try {
					fn(...fnArgs, (error: any, result?: R) => {
						registration.unregister();
						if (error) {
							reject(error);
						} else {
							resolve(result!);
						}
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
	private _source: CancellationTokenSource;
	private _promise: Promise<T>;
	private _isCompleted = false;

	constructor(
		operation: (token: CancellationToken) => Promise<T>,
		options: CancellationTokenOptions = {}
	) {
		this._source = new CancellationTokenSource(options);
		this._promise = this.executeOperation(operation);
	}

	public get token(): CancellationToken {
		return this._source.token;
	}

	public get isCompleted(): boolean {
		return this._isCompleted;
	}

	public get isCancelled(): boolean {
		return this._source.isCancellationRequested;
	}

	private async executeOperation(operation: (token: CancellationToken) => Promise<T>): Promise<T> {
		try {
			const result = await this._source.token.race(operation(this._source.token));
			this._isCompleted = true;
			return result;
		} catch (error) {
			this._isCompleted = true;
			throw error;
		} finally {
			this._source.dispose();
		}
	}

	public cancel(reason?: string): void {
		this._source.cancel(reason);
	}

	public async waitForCompletion(): Promise<T> {
		return this._promise;
	}
}

export default {
	CancellationToken,
	CancellationTokenSource,
	CancellationTokenUtils,
	CancellableOperation,
	OperationCancelledError,
	TimeoutError
};
