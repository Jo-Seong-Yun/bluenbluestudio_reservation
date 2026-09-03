"use client";

import { useActionState, useState } from "react";
import { saveProduct, type ActionState } from "../../actions";
import { Button, ErrorText, Field, inputClass } from "@/components/ui";
import { Markdown } from "@/components/markdown";
import { ImageUploader } from "./image-uploader";

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
};

export function ProductForm({ initial }: { initial: ProductFormValues }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    saveProduct,
    null,
  );

  // 설명은 쓰면서 바로 확인해야 하므로 화면 상태로 들고 있는다.
  const [description, setDescription] = useState(initial.description);
  const [coverImage, setCoverImage] = useState(initial.coverImage);
  const [gallery, setGallery] = useState(initial.gallery);

  return (
    <form action={action} className="space-y-8">
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
      </section>

      <section>
        <h2 className="mb-1 text-sm font-medium">상세 설명</h2>
        <p className="text-muted mb-3 text-xs">
          마크다운으로 쓸 수 있어요. <code>## 제목</code>, <code>- 목록</code>,{" "}
          <code>**굵게**</code>
        </p>

        <div className="grid gap-4 lg:grid-cols-2">
          <textarea
            name="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={16}
            placeholder={
              "## 이런 분께 추천해요\n\n- 이력서용 사진이 필요한 분\n\n## 포함 사항\n\n- 촬영 60분\n- 보정본 5장"
            }
            className={`${inputClass} resize-y font-mono text-sm`}
          />

          <div className="border-border bg-surface min-h-40 rounded-lg border px-4 py-3">
            <p className="text-muted mb-2 text-xs">손님에게 보이는 모습</p>
            {description.trim() ? (
              <Markdown>{description}</Markdown>
            ) : (
              <p className="text-muted text-sm">왼쪽에 입력하면 여기 보여요.</p>
            )}
          </div>
        </div>
      </section>

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

      <section className="border-border border-t pt-6">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="isPublished"
            defaultChecked={initial.isPublished}
            className="h-4 w-4"
          />
          <span className="text-sm font-medium">손님에게 공개</span>
        </label>
        <p className="text-muted mt-1 text-xs">
          꺼두면 초안으로 저장돼요. 준비가 끝나면 켜세요.
        </p>
      </section>

      <ErrorText>{state?.error}</ErrorText>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중…" : "저장"}
        </Button>
      </div>
    </form>
  );
}
