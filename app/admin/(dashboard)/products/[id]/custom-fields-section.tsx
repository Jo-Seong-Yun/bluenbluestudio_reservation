import { inputClass } from "@/components/ui";
import { moveCustomField } from "@/app/admin/actions";
import { DeleteFieldButton } from "./delete-field-button";
import { FieldModal } from "./field-modal";
import type { CustomField } from "@/lib/booking/custom-fields";

const TYPE_LABELS: Record<string, string> = {
  short_text: "단답형",
  long_text: "장문형",
  single_choice: "객관식 (하나 선택)",
  multi_choice: "체크박스 (여러 개 선택)",
  checkbox: "단일 체크박스 (동의/확인용)",
};

/**
 * 이 상품의 예약 폼에만 붙는 추가 문항 관리. 예전엔 전체 상품 공통인
 * 별도 화면(/admin/form-builder)이었는데, 상품마다 다른 문항이
 * 필요해져서 상품 수정 화면 안으로 옮겼다.
 */
export function CustomFieldsSection({
  productId,
  fields,
}: {
  productId: string;
  fields: CustomField[];
}) {
  return (
    <div className="mt-10">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">신청서 추가 문항</h2>
          <p className="text-muted mt-1 text-sm">
            이 상품 예약 폼에 이름·연락처 같은 기본 항목 다음으로 붙는 질문을
            직접 만들어요. 다른 상품엔 영향 없어요.
          </p>
        </div>
        <FieldModal productId={productId} />
      </div>

      <div className="border-border bg-surface rounded-xl border">
        {fields.length === 0 ? (
          <p className="text-muted p-6 text-center text-sm">
            아직 추가한 문항이 없어요. 기본 항목(이름·연락처·성별·생년월일
            등)만으로 신청서가 나가요.
          </p>
        ) : (
          <ul>
            {fields.map((field, index) => (
              <li
                key={field.id}
                className={`border-border flex flex-wrap items-start gap-3 border-b p-4 last:border-0 ${
                  field.active ? "" : "opacity-50"
                }`}
              >
                <div className="flex flex-col gap-0.5">
                  <MoveButton
                    id={field.id}
                    productId={productId}
                    direction="up"
                    disabled={index === 0}
                    label="위로"
                  />
                  <MoveButton
                    id={field.id}
                    productId={productId}
                    direction="down"
                    disabled={index === fields.length - 1}
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
                  <FieldModal productId={productId} field={field} />
                  <DeleteFieldButton
                    id={field.id}
                    productId={productId}
                    label={field.label}
                  />
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
  productId,
  direction,
  disabled,
  label,
}: {
  id: string;
  productId: string;
  direction: "up" | "down";
  disabled: boolean;
  label: string;
}) {
  return (
    <form action={moveCustomField}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="productId" value={productId} />
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
