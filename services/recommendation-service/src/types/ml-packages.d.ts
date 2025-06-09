import { Matrix } from "ml-matrix";

declare module 'ml-matrix' {
  export class Matrix {
    constructor(rows: number, columns: number);
    constructor(data: number[][]);
    static from1DArray(rows: number, columns: number, data: number[]): Matrix;
    get(row: number, column: number): number;
    set(row: number, column: number, value: number): void;
    clone(): Matrix;
    transpose(): Matrix;
    multiply(other: Matrix): Matrix;
    addRow(row: number[]): void;
    subMatrix(startRow: number, endRow: number, startColumn: number, endColumn: number): Matrix;
    toString(): string;
  }
}

declare module 'ml-kmeans' {
  export interface KMeansOptions {
    maxIterations?: number;
    tolerance?: number;
    distanceFunction?: (a: number[], b: number[]) => number;
    seed?: number;
  }

  export interface KMeansResult {
    clusters: number[];
    centroids: number[][];
    iterations: number;
    converged: boolean;
  }

  export const kmeans: (data: number[][] | Matrix, k: number, options?: KMeansOptions) => KMeansResult;
  export default kmeans;
}
