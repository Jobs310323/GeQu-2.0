// Working with arrays the code knows are non-empty.
//
// `noUncheckedIndexedAccess` types every `arr[i]` as `T | undefined`, which is
// right for data-driven arrays and noise for fixed constants like the three
// Snowman spheres or the four Stroop colours. Declaring those as a non-empty
// tuple lets the compiler keep the guarantee instead of each call site
// asserting it away with `!`.

/** An array the type system knows has at least one element. */
export type NonEmptyArray<T> = [T, ...T[]];

/** True when `arr` has at least one element, narrowing it for the caller. */
export function isNonEmpty<T>(arr: T[]): arr is NonEmptyArray<T> {
    return arr.length > 0;
}

/** A uniformly random element. Total, because the input cannot be empty. */
export function randomOf<T>(arr: NonEmptyArray<T>): T {
    return arr[Math.floor(Math.random() * arr.length)] ?? arr[0];
}

/** The last element. Total, because the input cannot be empty. */
export function lastOf<T>(arr: NonEmptyArray<T>): T {
    return arr[arr.length - 1] ?? arr[0];
}
