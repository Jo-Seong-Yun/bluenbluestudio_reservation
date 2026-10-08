/** Missing settings/snapshots retain the existing deposit workflow. */
export function depositEnabled(style: unknown): boolean {
  return (
    (style as { depositEnabled?: unknown } | null)?.depositEnabled !== false
  );
}
export function requiresDeposit(reservation: {
  deposit_required?: boolean;
}): boolean {
  return reservation.deposit_required !== false;
}
export function allowedNextStatuses(status: string, required = true): string[] {
  if (status === "requested") return ["schedule_confirmed"];
  if (status === "schedule_confirmed")
    return required ? ["payment_confirmed"] : ["completed", "no_show"];
  if (status === "payment_confirmed") return ["completed", "no_show"];
  return [];
}
export function previousConfirmedStatus(required = true) {
  return required ? "payment_confirmed" : "schedule_confirmed";
}
export function confirmedLabel(
  status: string,
  required: boolean,
  fallback: string,
) {
  return status === "schedule_confirmed" && !required ? "예약확정" : fallback;
}
