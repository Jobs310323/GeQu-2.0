/** One cell of a tap-in-order grid. Schulte holds numbers; trail-making mixes
 *  numbers and letters, hence the type parameter. */
export type GridCell<T = number> = { value: T; status: 'pending' | 'correct' | 'error' };
