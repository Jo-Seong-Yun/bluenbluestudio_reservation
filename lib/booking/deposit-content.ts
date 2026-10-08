import { toEditorHtml } from "@/lib/notifications/email-html";
import { sanitizeDescriptionHtml } from "@/lib/sanitize-description";
/** Preserve saved templates; omit deposit/account instruction blocks only in OFF renders. */
export function depositContent(
  html: string,
  required: boolean,
  account?: string | null,
): string {
  if (required) return html;
  return sanitizeDescriptionHtml(toEditorHtml(html), (frame) => {
    const text = frame.text.trim();
    const instruction =
      /예약금|입금|계좌/.test(text) || (!!account && text.includes(account));
    return (
      (["p", "li", "tr", "td", "th", "h2", "h3", "blockquote"].includes(
        frame.tag,
      ) &&
        instruction) ||
      (frame.tag === "div" &&
        ((!!account && text === account) || /^\{\{\s*계좌\s*\}\}$/.test(text)))
    );
  });
}
export function depositText(
  text: string,
  required: boolean,
  account?: string | null,
): string {
  return required
    ? text
    : text
        .split("\n")
        .filter(
          (line) =>
            !/예약금|입금|계좌/.test(line) &&
            !(account && line.includes(account)),
        )
        .join("\n");
}
export function depositCtas<T extends { text: string }>(
  ctas: T[] | null | undefined,
  required: boolean,
): T[] | null | undefined {
  return required
    ? ctas
    : ctas?.filter((cta) => !/예약금|입금|계좌/.test(cta.text));
}
