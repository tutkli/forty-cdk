export type CommentBucket = 'publicJsdoc' | 'internalJsdoc' | 'marker' | 'plain';

export interface ClassifiedComment {
  readonly pos: number;
  readonly end: number;
  readonly bucket: CommentBucket;
}

export interface CommentDensity {
  readonly nonBlank: number;
  readonly markers: number;
  readonly buckets: Readonly<Record<CommentBucket, number>>;
}

export declare function classifiedComments(text: string): ClassifiedComment[];

export declare function measure(text: string): CommentDensity;
