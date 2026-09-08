import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Button, Field, inputClass } from "@/components/ui";
import { addCustomField, moveCustomField } from "@/app/admin/actions";
import { DeleteFieldButton } from "./delete-field-button";

export const metadata: Metadata = { title: "양식관리" };

const TYPE_LABELS: Record<string, string> = {
  short_text: "한 줄 텍스트",
  long_text: "여러 줄 텍스트",
  single_choice: "객관식 (하나 선택)",
  multi_choice: "체크박스 (여러 개 선택)",
  checkbox: "단일 체크박스 (동의/확인용)",
};

export default async function FormBuilderPage() {
  const supabase = await createClient();
  const { data: fields } = await supabase
    .from("custom_fields")
    .select("id, label, type, options, required, sort_order")
    .order("sort_order");

  const rows = fields ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold">양식관리</h1>
      <p className="text-muted mt-1 text-sm">
        예약 신청서에 이름·연락처 같은 기본 항목 다음으로 붙는 추가 문항을 직접
        만들어요. 여기서 만든 순서 그대로 손님 화면에 나타나요.
      </p>

      <div className="border-border bg-surface mt-6 rounded-xl border p-4">
        <p className="font-medium">새 문항 추가</p>
        <form action={addCustomField} className="mt-3 space-y-4">
          <Field label="질문" required>
            <input
              name="label"
              required
              maxLength={100}
              placeholder="예: 선호하는 촬영 컨셉"
              className={inputClass}
            />
          </Field>

          <Field label="유형" required>
            <select name="type" required className={inputClass} defaultValue="">
              <option value="" disabled>
                선택해주세요
              </option>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="보기 (선택)"
            hint="객관식·체크박스일 때만 사용해요. 한 줄에 보기 하나씩 입력."
          >
            <textarea
              name="options"
              rows={3}
              placeholder={"예시\n실내\n야외\n실내+야외"}
              className={inputClass}
            />
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="required" className="h-4 w-4" />
            필수 응답으로 만들기
          </label>

          <Button type="submit">문항 추가</Button>
        </form>
      </div>

      <div className="border-border bg-surface mt-6 rounded-xl border">
        {rows.length === 0 ? (
          <p className="text-muted p-6 text-center text-sm">
            아직 추가한 문항이 없어요. 기본 항목(이름·연락처·성별·생년월일
            등)만으로 신청서가 나가요.
          </p>
        ) : (
          <ul>
            {rows.map((field, index) => (
              <li
                key={field.id}
                className="border-border flex flex-wrap items-start gap-3 border-b p-4 last:border-0"
              >
                <div className="flex flex-col gap-0.5">
                  <MoveButton
                    id={field.id}
                    direction="up"
                    disabled={index === 0}
                    label="위로"
                  />
                  <MoveButton
                    id={field.id}
                    direction="down"
                    disabled={index === rows.length - 1}
                    label="아래로"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{field.label}</span>
                    {field.required ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800 dark:bg-red-950 dark:text-red-300">
                        필수
                      </span>
                    ) : null}
                  </div>
                  <p className="text-muted mt-0.5 text-sm">
                    {TYPE_LABELS[field.type] ?? field.type}
                  </p>
                  {field.options && field.options.length > 0 ? (
                    <p className="text-muted mt-1 text-xs">
                      보기: {field.options.join(" · ")}
                    </p>
                  ) : null}
                </div>

                <DeleteFieldButton id={field.id} label={field.label} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function MoveButton({
  id,
  direction,
  disabled,
  label,
}: {
  id: string;
  direction: "up" | "down";
  disabled: boolean;
  label: string;
}) {
  return (
    <form action={moveCustomField}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="direction" value={direction} />
      <button
        type="submit"
        disabled={disabled}
        aria-label={label}
        className="text-muted hover:bg-surface-subtle hover:text-foreground flex h-5 w-6 items-center justify-center rounded text-xs disabled:opacity-25 disabled:hover:bg-transparent"
      >
        {direction === "up" ? "▲" : "▼"}
      </button>
    </form>
  );
}
