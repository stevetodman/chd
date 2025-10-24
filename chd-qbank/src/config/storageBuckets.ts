import bucketConfig from './storageBuckets.json';

export type StorageBucketExpectation = {
  name: string;
  public: boolean;
};

export const EXPECTED_STORAGE_BUCKETS = bucketConfig as readonly StorageBucketExpectation[];
