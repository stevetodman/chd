export type StorageBucketExpectation = {
  name: string;
  public: boolean;
};

export const EXPECTED_STORAGE_BUCKETS: readonly StorageBucketExpectation[] = [
  { name: "murmurs", public: false },
  { name: "cxr", public: false },
  { name: "ekg", public: false },
  { name: "diagrams", public: false }
];
