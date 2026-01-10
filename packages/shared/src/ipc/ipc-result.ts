type OkResult<T>  = { isOk: true; isErr: false; data: T };
type ErrResult<E> = { isOk: false; isErr: true; error: E };

export type IPCResult<T, E> = [E] extends [never] ? OkResult<T> : OkResult<T> | ErrResult<E>;
export type Unit            = { readonly __unit: unique symbol; };

export const unit = {} as Unit;

export function ok(): OkResult<Unit>;
export function ok<T>(data: T): OkResult<T>;
export function ok<T>(data?: T): OkResult<T | Unit> {
	// Check arg length instead of null coalescing to `unit` so `null` values don't end up being `{}`
	if (arguments.length === 0) {
		return { isOk: true, isErr: false, data: unit };
	}

	return { isOk: true, isErr: false, data: data as T };
}

export function err<E>(error: E): ErrResult<E> {
	return { isOk: false, isErr: true, error };
}

export function unwrap<T>(r: IPCResult<T, never>): T {
	return r.data;
}
