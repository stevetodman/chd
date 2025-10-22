import type { LabValue } from "../lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";

type Props = {
  labs?: LabValue[] | null;
  title?: string | null;
};

export default function LabPanel({ labs, title = "Vitals & Labs" }: Props) {
  if (!labs || labs.length === 0) {
    return null;
  }

  return (
    <Card className="bg-white">
      {title ? (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent>
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
}
