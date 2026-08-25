// Procedurally generated, non-verbal matrix-reasoning items in the spirit of
// Raven's Progressive Matrices — not a reproduction of the copyrighted
// original plates, which this test does not have a license to use.

export type RavenShape = 'circle' | 'square' | 'triangle' | 'diamond' | 'star' | 'hexagon';

export interface RavenCell {
    shape: RavenShape;
    count: 1 | 2 | 3;
    filled: boolean;
    rotation: number; // degrees
}

export interface RavenItem {
    id: number;
    tier: 1 | 2 | 3;
    /** 8 cells, row-major, missing the 9th (bottom-right, the one being solved for). */
    grid: RavenCell[];
    options: RavenCell[];
    correctIndex: number;
}
