import type { CustomField } from "./custom-fields-shared";
import type { BookingCopy } from "./copy";

export type FormPage = {
  id: number;
  label: string;
  title: string;
  intro: string;
};
export const MAX_FORM_PAGES = 20;
const LABELS = ["배우 정보", "연락 정보", "촬영 요청", "동의 확인"];
const KEYS = [
  ["actorTitle", "actorIntro"],
  ["contactTitle", "contactIntro"],
  ["requestTitle", "requestIntro"],
  ["consentTitle", "consentIntro"],
];

export function parseFormPages(value: unknown): FormPage[] | null {
  if (typeof value !== "string" || value.length > 45000) return null;
  try {
    const pages: unknown = JSON.parse(value);
    if (!Array.isArray(pages) || !pages.length || pages.length > MAX_FORM_PAGES)
      return null;
    const ids = new Set<number>();
    for (const page of pages) {
      if (
        !page ||
        typeof page !== "object" ||
        !Number.isInteger(page.id) ||
        page.id < 0 ||
        page.id > 999 ||
        ids.has(page.id)
      )
        return null;
      if (
        typeof page.label !== "string" ||
        !page.label.trim() ||
        page.label.length > 80 ||
        typeof page.title !== "string" ||
        !page.title.trim() ||
        page.title.length > 1000 ||
        typeof page.intro !== "string" ||
        page.intro.length > 1000
      )
        return null;
      ids.add(page.id);
    }
    return pages.map((page) => ({
      id: page.id,
      label: page.label.trim(),
      title: page.title.trim(),
      intro: page.intro.trim(),
    }));
  } catch {
    return null;
  }
}

/** Legacy page IDs stay stable, including their automatic actor/contact behavior. */
export function formPages(copy: BookingCopy): FormPage[] {
  return (
    parseFormPages(copy.formPages) ??
    LABELS.map((label, id) => ({
      id,
      label,
      title: copy[KEYS[id][0]] ?? label,
      intro: copy[KEYS[id][1]] ?? "",
    }))
  );
}
export function orderedFormFields(
  fields: CustomField[],
  copy: BookingCopy,
): CustomField[] {
  return [...fields].sort(
    (a, b) =>
      Number(copy[`order:${a.id}`] ?? a.sort_order) -
      Number(copy[`order:${b.id}`] ?? b.sort_order),
  );
}
export function copyWithPages(
  copy: BookingCopy,
  pages: FormPage[],
): BookingCopy {
  const next: BookingCopy = { ...copy, formPages: JSON.stringify(pages) };
  for (const page of pages)
    if (KEYS[page.id]) {
      next[KEYS[page.id][0]] = page.title;
      next[KEYS[page.id][1]] = page.intro;
    }
  return next;
}

/** Copy ID-bound page, placeholder and order settings alongside copied questions. */
export function remapFormCopy(
  copy: BookingCopy,
  ids: Record<string, string>,
): BookingCopy {
  const result: BookingCopy = {};
  for (const [key, value] of Object.entries(copy)) {
    const match = /^(group|placeholder|order):(.+)$/.exec(key);
    if (!match) result[key] = value;
    else if (ids[match[2]]) result[`${match[1]}:${ids[match[2]]}`] = value;
  }
  return result;
}
