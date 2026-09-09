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

  return (
    <form id={formId} action={action} className="space-y-8">
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

        <Field label="한 줄 소개" hint="상품 목록에서 이름 아래 작게 보여요.">
          <input
            name="summary"
            defaultValue={initial.summary}
            placeholder="한 사람을 위한 기본 프로필 촬영"
            className={inputClass}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="촬영 시간 (분)" hint="예약 한 칸의 길이예요.">
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
            hint="촬영 뒤 정리에 필요한 시간. 다음 칸을 막아요."
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
            hint="비워두면 자동으로 만들어요. 예: profile"
          >
            <input
              name="slug"
              defaultValue={initial.slug}
              placeholder="profile"
              className={`${inputClass} font-mono`}
            />
          </Field>
        </div>

        <Field label="태그 색상" hint="상품 목록 카드에 작게 표시돼요.">
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

      {/* 상세 설명은 이 폼에서 다루지 않는다(옆 칸의 에디터가 따로
          저장한다). 이 hidden input은 이 폼을 제출할 때 그 값을
          지우지 않고 그대로 실어 보내기 위한 것이다. */}
      <input type="hidden" name="description" value={initial.description} />

      <section className="space-y-4">
        <ImageUploader
          label="대표 이미지"
          hint="상품 목록과 상세 화면 맨 위에 보여요."
          value={coverImage ? [coverImage] : []}
          onChange={(paths) => setCoverImage(paths[0] ?? null)}
          max={1}
        />
        <input type="hidden" name="coverImage" value={coverImage ?? ""} />

        <ImageUploader
          label="예시 사진"
          hint="여러 장 올릴 수 있어요."
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
