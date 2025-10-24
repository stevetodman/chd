import { classNames } from "../../lib/utils";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return <div className={classNames("animate-pulse rounded-md bg-neutral-200", className)} />;
}

export default Skeleton;
