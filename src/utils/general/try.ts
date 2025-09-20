export type TryFunction<T> = () => Promise<T>;

export type TryResultSuccess<T> = [T, null];

export type TryResultFailure = [null, Error];

export type TryResult<T> = TryResultSuccess<T> | TryResultFailure;

export const trycatch = async <T>(
	fn: TryFunction<T>,
): Promise<TryResult<T>> => {
	try {
		const result = await fn();
		return [result, null];
	} catch (e) {
		return [null, e as Error];
	}
};
