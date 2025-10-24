import { classNames } from "../../lib/utils";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return <div className={classNames("animate-pulse rounded-md bg-neutral-200/80", className)} />;
}

type SkeletonBlockProps = {
  lines?: number;
  className?: string;
  lineClassName?: string;
};

export function SkeletonBlock({ lines = 3, className, lineClassName }: SkeletonBlockProps) {
  return (
    <div className={classNames("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className={classNames("h-3 w-full", lineClassName)} />
      ))}
    </div>
  );
}

type SkeletonCardProps = {
  className?: string;
  headingWidth?: string;
  bodyLines?: number;
};

export function SkeletonCard({ className, headingWidth = "w-1/3", bodyLines = 3 }: SkeletonCardProps) {
  return (
    <div className={classNames("rounded-xl border border-neutral-200 bg-white p-4 shadow-sm", className)}>
      <Skeleton className={classNames("h-4", headingWidth)} />
      <SkeletonBlock lines={bodyLines} className="mt-3" />
    </div>
  );
}

export default Skeleton;
