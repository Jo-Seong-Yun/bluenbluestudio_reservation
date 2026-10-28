import type { CustomField } from "./custom-fields-shared";
import {
  fieldFormName,
  bookingReviewAnswers,
  selectedPricedOptions,
} from "./custom-fields-shared";
import type { BookingCopy } from "./copy";
export type ApplicationDefinition = {
  version: 1;
  renderedAt: number;
  product: {
    id: string;
    name: string;
    basePrice: number;
    durationMin: number;
    bufferAfterMin: number;
  };
  fields: CustomField[];
  copy: BookingCopy;
};
export type SubmittedApplication = ApplicationDefinition & {
  submittedAt: string;
  answers: Record<string, string[]>;
  candidates: { date: string; time: string }[];
  estimatedAmount: number;
  provenance: "rendered" | "current_definition";
  issues: string[];
};
export function captureApplication(
  definition: ApplicationDefinition,
  data: FormData,
  candidates: SubmittedApplication["candidates"],
  estimatedAmount: number,
  provenance: SubmittedApplication["provenance"],
  issues: string[],
): SubmittedApplication {
  return JSON.parse(
    JSON.stringify({
      ...definition,
      submittedAt: new Date().toISOString(),
      answers: Object.fromEntries(
        definition.fields.map((f) => [
          f.id,
          data.getAll(fieldFormName(f.id)).map(String),
        ]),
      ),
      candidates,
      estimatedAmount,
      provenance,
      issues,
    }),
  );
}
export function applicationSummary(snapshot: SubmittedApplication) {
  const data = new FormData();
  for (const f of snapshot.fields)
    for (const value of snapshot.answers[f.id] ?? [])
      data.append(fieldFormName(f.id), value);
  return bookingReviewAnswers(snapshot.fields, data).map((row, i) => ({
    ...row,
    type: snapshot.fields[i].type,
  }));
}
export function submittedPrice(
  fields: CustomField[],
  data: FormData,
  basePrice: number,
) {
  const chosen = new Map<string, string[]>();
  for (const f of fields)
    chosen.set(
      f.id,
      [...new Set(data.getAll(fieldFormName(f.id)).map(String))].filter(
        (value) => (f.options ?? []).includes(value),
      ),
    );
  return (
    basePrice +
    selectedPricedOptions(fields, chosen).reduce(
      (sum, item) => sum + item.price,
      0,
    )
  );
}
