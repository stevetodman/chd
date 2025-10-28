import { describe, expect as vitestExpect, it } from "vitest";

type TestFunction = typeof it;

type DescribeFunction = typeof describe;

const testFn = ((name: Parameters<TestFunction>[0], fn?: Parameters<TestFunction>[1]) => {
  return it.skip(name, fn as Parameters<TestFunction>[1]);
}) as TestFunction & {
  describe: DescribeFunction;
  skip: TestFunction;
};

testFn.describe = ((name: Parameters<DescribeFunction>[0], fn?: Parameters<DescribeFunction>[1]) => {
  return describe.skip(name, fn as Parameters<DescribeFunction>[1]);
}) as DescribeFunction;

testFn.skip = ((name: Parameters<TestFunction>[0], fn?: Parameters<TestFunction>[1]) => {
  return it.skip(name, fn as Parameters<TestFunction>[1]);
}) as TestFunction;

const expect = vitestExpect;

export { testFn as test, expect };
