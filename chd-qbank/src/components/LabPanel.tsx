import { useId } from "react";
import type { LabValue } from "../lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";

type Props = {
  labs?: LabValue[] | null;
  title?: string | null;
  labelId?: string;
  showTitle?: boolean;
  asSection?: boolean;
};

export default function LabPanel({
  labs,
  title = "Vitals & Labs",
  labelId,
  showTitle = true,
  asSection = true
}: Props) {
  if (!labs || labs.length === 0) {
    return null;
  }

  const headingId = useId();

  const content = (
    <Card className={showTitle ? "bg-white" : "border-0 bg-transparent shadow-none p-0"}>
      {showTitle && title ? (
        <CardHeader>
          <CardTitle id={headingId}>{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className={showTitle ? undefined : "p-0"}>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {labs.map((lab) => (
            <div key={`${lab.label}-${lab.value}`} className="flex flex-col">
              <dt className="text-neutral-500">{lab.label}</dt>
              <dd className="font-medium text-neutral-900">
                {lab.value}
                {lab.unit ? <span className="text-xs text-neutral-400"> {lab.unit}</span> : null}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );

  if (!asSection) {
    return content;
  }

  return (
    <section
      role="complementary"
      aria-labelledby={showTitle && title ? headingId : labelId}
      aria-label={showTitle && title ? undefined : "Vitals and labs"}
    >
      {content}
    </section>
  );
}
