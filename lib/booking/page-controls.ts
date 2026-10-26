import { fieldGroup, type BookingCopy } from "./copy";
import { formPages } from "./form-pages";
import type { CustomField } from "./custom-fields-shared";
export function customerFields(fields: CustomField[], copy: BookingCopy) {
  const hidden = new Set(
    formPages(copy)
      .filter((p) => p.hidden)
      .map((p) => p.id),
  );
  return fields.filter(
    (f) =>
      ["name", "phone"].includes(f.type) || !hidden.has(fieldGroup(f, copy)),
  );
}
export function customerCopy(copy: BookingCopy, fields: CustomField[]) {
  const pages = formPages(copy),
    first = pages.find((p) => !p.hidden) ?? pages[0];
  const next = { ...copy };
  for (const f of fields)
    if (
      ["name", "phone"].includes(f.type) &&
      pages.find((p) => p.id === fieldGroup(f, copy))?.hidden
    )
      next[`group:${f.id}`] = String(first.id);
  return next;
}
