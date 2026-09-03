/**
 * 관리자 화면에서 반복해서 쓰는 작은 조각들.
 * 화면 수가 적어 디자인 시스템까지는 필요 없고, 클래스 문자열이
 * 여기저기 복사되는 것만 막는다.
 */
import type { ComponentProps } from "react";

export const inputClass =
  "border-border bg-surface w-full rounded-lg border px-3 py-2 text-base " +
  "outline-none focus:border-brand focus:ring-brand/30 focus:ring-2";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint ? (
        <span className="text-muted mt-1 block text-xs">{hint}</span>
      ) : null}
    </label>
  );
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: "primary" | "ghost" | "danger" }) {
  const styles = {
    primary: "bg-brand text-brand-foreground hover:bg-brand-hover",
    ghost: "border-border bg-surface hover:bg-surface-subtle border",
    danger: "border-border text-muted hover:bg-surface-subtle border",
  }[variant];

  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${styles} ${className}`}
    />
  );
}

export function ErrorText({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
    >
      {children}
    </p>
  );
}
