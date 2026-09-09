import { inputClass } from "@/components/ui";
import { moveCustomField } from "@/app/admin/actions";
import { DeleteFieldButton } from "./delete-field-button";
import { FieldModal } from "./field-modal";
import {
  FIELD_TYPE_LABELS,
  type CustomField,
} from "@/lib/booking/custom-fields-shared";

/**
 * 이 상품의 예약 폼 문항 전부를 여기서 관리한다. 이름·연락처·이메일·
 * 성별·생년월일도 더 이상 폼에 하드코딩된 "기본 항목"이 아니라, 상품을
 * 만들 때 기본으로 생겨나는 문항일 뿐이다(app/admin/actions.ts의
 * DEFAULT_CUSTOM_FIELDS) — 다른 문항처럼 라벨을 바꾸거나 지울 수 있다.
 */
export function CustomFieldsSection({
  productId,
  fields,
}: {
  productId: string;
  fields: CustomField[];
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">신청서 문항</h2>
          <p className="text-muted mt-1 text-sm">
            이 상품 예약 폼에 나갈 질문을 순서대로 관리해요. 다른 상품엔 영향
            없어요.
          </p>
        </div>
        <FieldModal productId={productId} />
      </div>

      <div className="border-border bg-surface rounded-xl border">
        {fields.length === 0 ? (
          <p className="text-muted p-6 text-center text-sm">
            아직 문항이 없어요. &quot;질문 추가&quot;를 눌러 신청서에 넣을
            질문을 만들어보세요.
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
                      {FIELD_TYPE_LABELS[field.type] ?? field.type}
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

  if (field.type === "gender") {
    return (
      <div className="flex gap-4">
        <label className="text-muted flex items-center gap-1.5 text-sm">
          <input type="radio" disabled />
          남성
        </label>
        <label className="text-muted flex items-center gap-1.5 text-sm">
          <input type="radio" disabled />
          여성
        </label>
      </div>
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
