"use client";

import { useState } from "react";
import type { ActionState } from "../../actions";
import { ErrorText, Field, inputClass } from "@/components/ui";
import { ImageUploader } from "./image-uploader";
import { PRODUCT_TAG_COLORS } from "@/lib/product-tag-colors";

export type ProductFormValues = {
  id?: string;
  name: string;
  slug: string;
  durationMin: number;
  bufferAfterMin: number;
  price: number;
  salePrice: number | null;
  maxPeople: number | null;
  summary: string;
  description: string;
  coverImage: string | null;
  gallery: string[];
  isPublished: boolean;
  tagColor: string | null;
};

export function ProductForm({
  initial,
  formId,
  action,
  state,
}: {
  initial: ProductFormValues;
  /** 이 id로 폼 밖(타이틀 옆 저장 버튼, 공개 여부 토글)에서도 같은 폼을 쓴다. */
  formId: string;
  action: (formData: FormData) => void;
  state: ActionState;
}) {
  const [coverImage, setCoverImage] = useState(initial.coverImage);
  const [gallery, setGallery] = useState(initial.gallery);

  // Enter를 치면 이 폼의 기본 동작(즉시 제출)이 아니라 다음 입력칸으로
  // 넘어가게 한다 — 저장은 "저장" 버튼이나 Ctrl+S로만 일어나는 별개의
  // 동작이어야 한다. 이 폼은 문항마다 감싸는 블록이 없으니(신청서
  // 폼과 달리) 폼 전체에서 보이는 입력칸을 순서대로 훑어 다음 칸을 찾는다.
  function handleFieldKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    const target = e.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.type !== "text" && target.type !== "number") return;

    e.preventDefault();

    const fields = Array.from(
      e.currentTarget.querySelectorAll<HTMLInputElement>(
        "input:not([type=hidden])",
      ),
    );
    const next = fields[fields.indexOf(target) + 1];
    next?.focus();
  }

  return (
    <form
      id={formId}
      action={action}
      onKeyDown={handleFieldKeyDown}
      className="space-y-8"
    >
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}

      <section className="space-y-4">
        <Field label="상품 이름">
          <input
            name="name"
            defaultValue={initial.name}
            required
            placeholder="프로필 촬영"
            className={inputClass}
          />
        </Field>

        <Field label="한 줄 소개" hint="상품 목록에서 이름 아래 작게 표시됩니다.">
          <input
            name="summary"
            defaultValue={initial.summary}
            placeholder="한 사람을 위한 기본 프로필 촬영"
            className={inputClass}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="촬영 시간 (분)" hint="예약 한 칸의 길이입니다.">
            <input
              name="durationMin"
              type="number"
              min={10}
              step={10}
              defaultValue={initial.durationMin}
              required
              className={inputClass}
            />
          </Field>

          <Field
            label="정리 시간 (분)"
            hint="촬영 뒤 정리에 필요한 시간. 다음 칸을 차단합니다."
          >
            <input
              name="bufferAfterMin"
              type="number"
              min={0}
              step={10}
              defaultValue={initial.bufferAfterMin}
              required
              className={inputClass}
            />
          </Field>
        </div>

        {/* 가격 관련 두 필드는 서로 짝이라 나란히 묶어 둔다 — 떨어져
            있으면 할인가가 정가와 무관한 값처럼 보였다. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="가격 (원)">
            <input
              name="price"
              type="number"
              min={0}
              step={1000}
              defaultValue={initial.price}
              required
              className={inputClass}
            />
          </Field>

          <Field
            label="할인가 (원, 선택)"
            hint="정가보다 낮은 값을 입력하면 예약 화면에 할인가로 표시됩니다. 비워두면 정가만 보입니다."
          >
            <input
              name="salePrice"
              type="number"
              min={0}
              step={1000}
              defaultValue={initial.salePrice ?? ""}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="최대 인원" hint="비워두면 제한 없음">
            <input
              name="maxPeople"
              type="number"
              min={1}
              defaultValue={initial.maxPeople ?? ""}
              className={inputClass}
            />
          </Field>

          <Field
            label="주소 (선택)"
            hint="비워두면 자동으로 생성됩니다. 예: profile"
          >
            <input
              name="slug"
              defaultValue={initial.slug}
              placeholder="profile"
              className={`${inputClass} font-mono`}
            />
          </Field>
        </div>

        <Field label="태그 색상" hint="상품 목록 카드에 작게 표시됩니다.">
          <div className="flex flex-wrap gap-2">
            <label title="색상 없음" className="cursor-pointer">
              <input
                type="radio"
                name="tagColor"
                value=""
                defaultChecked={!initial.tagColor}
                className="peer sr-only"
              />
              <span className="border-border text-muted peer-checked:border-brand peer-checked:ring-brand/30 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs peer-checked:ring-2">
                ✕
              </span>
            </label>
            {PRODUCT_TAG_COLORS.map((color) => (
              <label
                key={color.key}
                title={color.label}
                className="cursor-pointer"
              >
                <input
                  type="radio"
                  name="tagColor"
                  value={color.key}
                  defaultChecked={initial.tagColor === color.key}
                  className="peer sr-only"
                />
                <span
                  className={`block h-8 w-8 rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-(--color-surface) peer-checked:ring-(--color-brand) ${color.dot}`}
                />
              </label>
            ))}
          </div>
        </Field>
      </section>

      {/* 상세 설명은 옆 칸의 에디터(DescriptionEditor)에서 편집하지만,
          저장은 여기 없이 이 폼 하나로 같이 한다. 부모(ProductEditorPanel)가
          에디터의 onChange로 받은 최신 HTML을 initial.description으로
          내려주므로, 이 hidden input은 항상 최신 값을 싣고 있다. */}
      <input type="hidden" name="description" value={initial.description} />

      <section className="space-y-4">
        <ImageUploader
          label="대표 이미지"
          hint="상품 목록과 상세 화면 맨 위에 표시됩니다."
          value={coverImage ? [coverImage] : []}
          onChange={(paths) => setCoverImage(paths[0] ?? null)}
          max={1}
        />
        <input type="hidden" name="coverImage" value={coverImage ?? ""} />

        <ImageUploader
          label="예시 사진"
          hint="여러 장 업로드할 수 있습니다."
          value={gallery}
          onChange={setGallery}
        />
        {gallery.map((path) => (
          <input key={path} type="hidden" name="gallery" value={path} />
        ))}
      </section>

      <ErrorText>{state?.error}</ErrorText>
    </form>
  );
}
