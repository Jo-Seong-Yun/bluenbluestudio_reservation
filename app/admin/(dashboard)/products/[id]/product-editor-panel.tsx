"use client";

import { useActionState, useEffect, useState } from "react";
import { saveProduct, type ActionState } from "@/app/admin/actions";
import { ImageUploader } from "../image-uploader";
import { ProductForm, type ProductFormValues } from "../product-form";
import { DescriptionEditor } from "./description-editor";
import { Button } from "@/components/ui";
import { useReportPending } from "@/components/pending-overlay";
import { UnsavedGuard } from "./unsaved-guard";
import "./product-editor.css";
import { ProductLinkCopy } from "./product-link-copy";

const FORM_ID = "product-form";

/** Product and application tabs stay mounted to preserve unsaved inputs when switching. */
export function ProductEditorPanel({
  initial,
  description: initialDescription,
  children,
  informationExtra,
}: {
  initial: ProductFormValues;
  description: string;
  /** 페이지 목록·문항 편집·실제 신청서 미리보기. */
  children: React.ReactNode;
  informationExtra?: React.ReactNode;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    saveProduct,
    null,
  );
  useReportPending(pending);

  const [coverImage, setCoverImage] = useState(initial.coverImage);
  const [tab, setTab] = useState("information");
  const [description, setDescription] = useState(initialDescription);

  function markProductDirty(name: string) {
    document
      .querySelector<HTMLInputElement>(
        `input[form="${FORM_ID}"][name="${name}"], #${FORM_ID} input[name="${name}"]`,
      )
      ?.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // Ctrl+S / Cmd+S로 어디서든 저장할 수 있게 한다. 브라우저 기본
  // 동작(페이지 저장 대화상자)은 막고, 대신 기본정보 폼을 제출한다
  // — 상세 설명은 이미 description 상태로 그 폼의 숨은 입력에 실려 있다.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isSaveShortcut =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s";
      if (!isSaveShortcut) return;

      if (tab !== "information") return;
      event.preventDefault();
      const form = document.getElementById(FORM_ID);
      if (form instanceof HTMLFormElement) {
        form.requestSubmit();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tab]);

  return (
    <div>
      <UnsavedGuard productId={initial.id!} formId={FORM_ID} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{initial.name}</h1>
          <div className="mt-2">
            <ProductLinkCopy slug={initial.slug} />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="inline-flex cursor-pointer items-center gap-2">
            <span className="relative inline-block h-6 w-11 shrink-0">
              <input
                type="checkbox"
                name="isPublished"
                form={FORM_ID}
                defaultChecked={initial.isPublished}
                className="peer sr-only"
              />
              <span className="bg-surface-subtle border-border peer-checked:bg-brand peer-checked:border-brand absolute inset-0 rounded-full border transition-colors" />
              <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
            </span>
            <span className="text-sm font-medium">손님에게 공개</span>
          </label>

          {tab === "information" ? (
            <Button type="submit" form={FORM_ID} disabled={pending}>
              {pending ? "저장 중…" : "저장"}
            </Button>
          ) : null}
        </div>
      </div>

      <div
        className="product-editor-tabs"
        role="tablist"
        aria-label="상품 수정 영역"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "information"}
          aria-controls="product-information"
          id="product-information-tab"
          onClick={() => setTab("information")}
        >
          상품 정보
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "application"}
          aria-controls="product-application"
          id="product-application-tab"
          onClick={() => setTab("application")}
        >
          신청서 구성
        </button>
      </div>
      <div
        id="product-information"
        role="tabpanel"
        aria-labelledby="product-information-tab"
        hidden={tab !== "information"}
      >
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1.1fr_1fr]">
          <div className="editor-card min-w-0">
            <h2 className="mb-5 text-lg font-bold">상품 기본 정보</h2>
            <ProductForm
              showImage={false}
              initial={{ ...initial, description }}
              formId={FORM_ID}
              action={action}
              state={state}
            />
          </div>

          <div className="min-w-0 space-y-6">
            <div className="editor-card">
              <ImageUploader
                label="대표 이미지"
                hint="상품 선택 화면의 대표 이미지입니다."
                value={coverImage ? [coverImage] : []}
                onChange={(paths) => {
                  setCoverImage(paths[0] ?? null);
                  markProductDirty("coverImage");
                }}
                max={1}
              />
              <input
                type="hidden"
                form={FORM_ID}
                name="coverImage"
                value={coverImage ?? ""}
              />
            </div>
            <DescriptionEditor
              initial={initialDescription}
              onChange={(html) => {
                setDescription(html);
                markProductDirty("description");
              }}
            />
          </div>
        </div>
        <div className="mt-6">{informationExtra}</div>
      </div>
      <div
        id="product-application"
        role="tabpanel"
        aria-labelledby="product-application-tab"
        hidden={tab !== "application"}
      >
        {children}
      </div>
    </div>
  );
}
