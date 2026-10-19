type OkResult<T> = { isOk: true; isErr: false; data: T };
type ErrResult<E> = { isOk: false; isErr: true; error: E };

export type IPCResult<T, E> = [E] extends [never] ? OkResult<T> : OkResult<T> | ErrResult<E>;
