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
  required,
  children,
  labelClassName = "text-sm font-medium",
  hintClassName = "text-xs",
  hintPosition = "after",
}: {
  label: string;
  hint?: React.ReactNode;
  /** 필수 입력이면 라벨 옆에 빨간 별표를 붙인다. */
  required?: boolean;
  children: React.ReactNode;
  /** 라벨 글자 크기/굵기. 손님용 신청서(reservation-form.tsx)는 더 크게 쓴다. */
  labelClassName?: string;
  hintClassName?: string;
  /**
   * 상세설명(hint)을 입력칸 앞/뒤 어디에 둘지. 관리자 화면들은 입력칸
   * 아래 보조 설명으로 쓰므로 기본값 "after"를 그대로 쓰고, 손님용
   * 신청서(reservation-form.tsx)만 구글폼처럼 "라벨 → 상세설명 →
   * 입력칸" 순서가 되도록 "before"를 넘긴다.
   */
  hintPosition?: "before" | "after";
}) {
  const hintNode = hint ? (
    <span className={`text-muted block ${hintPosition === "before" ? "mb-1.5" : "mt-1"} ${hintClassName}`}>
      {hint}
    </span>
  ) : null;

  return (
    <label className="block">
      <span className={`mb-1.5 block ${labelClassName}`}>
        {label}
        {required ? (
          <span className="ml-0.5 text-red-600 dark:text-red-400">*</span>
        ) : null}
      </span>
      {hintPosition === "before" ? hintNode : null}
      {children}
      {hintPosition === "after" ? hintNode : null}
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
