import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";

type Lab = {
  label: string;
  value: string;
  unit?: string;
};

type Props = {
  labs?: Lab[];
};

const defaultLabs: Lab[] = [
  { label: "HR", value: "128", unit: "bpm" },
  { label: "BP", value: "74/38", unit: "mmHg" },
  { label: "SaO₂", value: "82", unit: "%" }
];

export default function LabPanel({ labs = defaultLabs }: Props) {
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Vitals & Labs</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {labs.map((lab) => (
            <div key={lab.label} className="flex flex-col">
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
