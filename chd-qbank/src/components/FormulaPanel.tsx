import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";

const formulas = [
  { name: "PVR", expression: "(Mean PAP - PCWP) / Cardiac Output" },
  { name: "Flow", expression: "ΔPressure / Resistance" },
  { name: "Qp:Qs", expression: "Pulmonary Flow / Systemic Flow" }
];

export default function FormulaPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Formula Quick Ref</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {formulas.map((formula) => (
            <li key={formula.name}>
              <p className="font-semibold">{formula.name}</p>
              <p className="text-neutral-600">{formula.expression}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
