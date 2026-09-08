import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { inputClass } from "@/components/ui";
import { moveCustomField } from "@/app/admin/actions";
import { DeleteFieldButton } from "./delete-field-button";
import { FieldModal } from "./field-modal";
import type { CustomField } from "@/lib/booking/custom-fields";

export const metadata: Metadata = { title: "양식관리" };

const TYPE_LABELS: Record<string, string> = {
  short_text: "단답형",
  long_text: "장문형",
  single_choice: "객관식 (하나 선택)",
  multi_choice: "체크박스 (여러 개 선택)",
  checkbox: "단일 체크박스 (동의/확인용)",
};

export default async function FormBuilderPage() {
  const supabase = await createClient();
  const { data: fields } = await supabase
    .from("custom_fields")
    .select(
      "id, label, type, options, description, required, active, sort_order, created_at",
    )
    .order("sort_order");

  const rows = fields ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">양식관리</h1>
          <p className="text-muted mt-1 text-sm">
            예약 신청서에 이름·연락처 같은 기본 항목 다음으로 붙는 추가 문항을
            직접 만들어요. 여기서 만든 순서 그대로 손님 화면에 나타나요.
          </p>
        </div>
        <FieldModal />
      </div>

      <div className="border-border bg-surface rounded-xl border">
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
                className={`border-border flex flex-wrap items-start gap-3 border-b p-4 last:border-0 ${
                  field.active ? "" : "opacity-50"
                }`}
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
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">
                      {field.label}
                      {field.required ? (
                        <span className="ml-0.5 text-red-600 dark:text-red-400">
                          *
                        </span>
                      ) : null}
                    </span>
                    <span className="text-muted text-xs">
                      {TYPE_LABELS[field.type] ?? field.type}
                    </span>
                    {!field.active ? (
                      <span className="bg-surface-subtle text-muted rounded-full px-2 py-0.5 text-xs">
                        비활성
                      </span>
                    ) : null}
                  </div>

                  <FieldPreview field={field} />

                  {field.description ? (
                    <p className="text-muted mt-1 text-xs">
                      {field.description}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-start gap-2">
                  <FieldModal field={field} />
                  <DeleteFieldButton id={field.id} label={field.label} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** 실제 손님 화면에 어떻게 보일지 미리 보여준다(입력은 안 되는 미리보기). */
function FieldPreview({ field }: { field: CustomField }) {
  const options = field.options ?? [];

  if (field.type === "long_text") {
    return (
      <textarea
        disabled
        rows={2}
        placeholder={field.label}
        className={`${inputClass} cursor-default`}
      />
    );
  }

  if (field.type === "single_choice" || field.type === "multi_choice") {
    return (
      <div className="space-y-1">
        {options.map((option) => (
          <label
            key={option}
            className="text-muted flex items-center gap-1.5 text-sm"
          >
            <input
              type={field.type === "single_choice" ? "radio" : "checkbox"}
              disabled
            />
            {option}
          </label>
        ))}
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="text-muted flex items-center gap-1.5 text-sm">
        <input type="checkbox" disabled />
        {field.label}
      </label>
    );
  }

  return (
    <input
      disabled
      placeholder={field.label}
      className={`${inputClass} cursor-default`}
    />
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
