"use client";
import { useActionState, useEffect, useId, useState } from "react";
import {
  DEFAULT_COPY,
  COPY_SECTIONS,
  COPY_LABELS,
  resolveCopy,
  fieldGroup,
  type BookingCopy,
} from "@/lib/booking/copy";
import {
  formPages,
  copyWithPages,
  orderedFormFields,
  MAX_FORM_PAGES,
  type FormPage,
} from "@/lib/booking/form-pages";
import { saveProductBookingCopy } from "@/app/admin/booking-copy-actions";
import { Button, Field, inputClass, ErrorText } from "@/components/ui";
import type { BookingDetailProduct } from "@/components/booking-detail";
import {
  FIELD_TYPE_LABELS,
  LOCKED_FIELD_TYPES,
  type CustomField,
} from "@/lib/booking/custom-fields-shared";
import { FieldDescription } from "@/components/field-description";
import { FieldModal } from "./field-modal";
import { DeleteFieldButton } from "./delete-field-button";
import { ImportFieldsButton } from "./import-fields-button";
import { FormLivePreview } from "./form-live-preview";
import "./product-editor.css";

export function BookingCopyEditor({
  product,
  initial,
  fields = [],
  depositRequired = true,
  otherProducts = [],
  mode = "form",
  previewSrc,
  bankAccount = null,
  notice = null,
}: {
  fields?: CustomField[];
  depositRequired?: boolean;
  product: BookingDetailProduct & { id: string };
  initial: BookingCopy;
  otherProducts?: { id: string; name: string }[];
  mode?: "details" | "form";
  previewSrc?: string;
  bankAccount?: string | null;
  notice?: string | null;
}) {
  const formId = useId();
  const [copy, setCopy] = useState(() => resolveCopy(initial));
  const [draftPages, setDraftPages] = useState(() =>
    formPages(resolveCopy(initial)),
  );
  const [savedCopy, setSavedCopy] = useState(() =>
    JSON.stringify(resolveCopy(initial)),
  );
  const [state, action, pending] = useActionState(
    async (
      previous: { error?: string; success?: boolean } | null,
      data: FormData,
    ) => {
      const snapshot = JSON.stringify(copy);
      const result = await saveProductBookingCopy(previous, data);
      if (result.success) setSavedCopy(snapshot);
      return result;
    },
    null,
  );
  const [selected, setSelected] = useState(() => formPages(copy)[0].id);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [stage, setStage] = useState<
    "detail" | "times" | "form" | "review" | "success"
  >("form");
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  const [desktop, setDesktop] = useState(false);
  const pages = draftPages;
  const layoutCopy = copyWithPages(
    copy,
    pages.map((page) => ({
      ...page,
      label: page.label.trim() || "새 페이지",
      title: page.title.trim() || "페이지 제목",
    })),
  );
  const page = pages.find((p) => p.id === selected) ?? pages[0];
  const pageFields = orderedFormFields(fields, copy).filter(
    (f) => fieldGroup(f, layoutCopy) === page.id,
  );
  const dirty = JSON.stringify(copy) !== savedCopy;
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    function protectNavigation(event: MouseEvent) {
      const anchor = (event.target as HTMLElement)?.closest("a");
      if (
        anchor?.getAttribute("href")?.startsWith("/") &&
        !confirm(
          "저장하지 않은 페이지 설정이 있습니다. 저장하지 않고 이동하시겠습니까?",
        )
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }
    function protectProductSave(event: Event) {
      if (
        event.target instanceof HTMLFormElement &&
        event.target.getAttribute("id") === "product-form" &&
        !confirm(
          "상품 정보를 저장하면 화면을 이동합니다. 저장하지 않은 페이지 설정을 버리고 진행하시겠습니까?",
        )
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }
    document.addEventListener("click", protectNavigation, true);
    document.addEventListener("submit", protectProductSave, true);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", protectNavigation, true);
      document.removeEventListener("submit", protectProductSave, true);
    };
  }, [dirty]);
  useEffect(() => {
    if (mode !== "form") return;
    function shortcut(event: KeyboardEvent) {
      if (
        !(event.ctrlKey || event.metaKey) ||
        event.key.toLowerCase() !== "s" ||
        pending
      )
        return;
      const form = document.getElementById(formId);
      if (
        form instanceof HTMLFormElement &&
        !form.closest('[role="tabpanel"]')?.hasAttribute("hidden")
      ) {
        event.preventDefault();
        form.requestSubmit();
      }
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [formId, mode, pending]);
  function updatePages(next: FormPage[]) {
    setDraftPages(next);
    setCopy(copyWithPages(copy, next));
  }
  function updatePage(key: "label" | "title" | "intro", value: string) {
    updatePages(
      pages.map((p) => (p.id === page.id ? { ...p, [key]: value } : p)),
    );
  }
  function movePage(direction: number) {
    const index = pages.findIndex((p) => p.id === page.id),
      target = index + direction;
    if (target < 0 || target >= pages.length) return;
    const next = [...pages];
    [next[index], next[target]] = [next[target], next[index]];
    updatePages(next);
  }
  function addPage() {
    const id = Math.max(...pages.map((p) => p.id)) + 1;
    updatePages([
      ...pages,
      { id, label: "새 페이지", title: "내용을 입력해 주세요", intro: "" },
    ]);
    setSelected(id);
  }
  function deletePage(id: number) {
    if (pages.length <= 1) return;
    const index = pages.findIndex((p) => p.id === id);
    if (index < 0) return;
    const removed = pages[index];
    const target = pages[index - 1] ?? pages[index + 1];
    if (
      !window.confirm(
        `"${removed.label}" 페이지를 삭제하시겠습니까? 이 페이지의 문항은 "${target.label}" 페이지로 이동하며 기존 답변은 유지됩니다. 페이지 구성 저장 시 반영됩니다.`,
      )
    )
      return;
    const next = pages.filter((p) => p.id !== id);
    const nextCopy = copyWithPages(copy, next);
    for (const field of fields) {
      const group = fieldGroup(field, layoutCopy);
      nextCopy[`group:${field.id}`] = String(group === id ? target.id : group);
    }
    setDraftPages(next);
    setCopy(nextCopy);
    if (selected === id) setSelected(target.id);
  }
  function moveField(id: string, direction: number) {
    const index = pageFields.findIndex((f) => f.id === id),
      target = index + direction;
    if (target < 0 || target >= pageFields.length) return;
    const reordered = orderedFormFields(fields, copy),
      a = reordered.findIndex((f) => f.id === id),
      b = reordered.findIndex((f) => f.id === pageFields[target].id);
    [reordered[a], reordered[b]] = [reordered[b], reordered[a]];
    setCopy({
      ...copy,
      ...Object.fromEntries(
        reordered.map((f, i) => [`order:${f.id}`, String(i)]),
      ),
    });
  }
  const sections = COPY_SECTIONS.filter((_, i) =>
    mode === "details" ? i === 0 : i !== 2,
  );
  const stageSection =
    COPY_SECTIONS[
      stage === "detail"
        ? 0
        : stage === "times"
          ? 1
          : stage === "review"
            ? 3
            : 4
    ];
  return (
    <section
      className="product-copy-editor"
      onFocusCapture={(event) => {
        const input = event.target as HTMLElement;
        const explicit = input.closest<HTMLElement>("[data-preview-target]")
          ?.dataset.previewTarget;
        if (explicit) {
          setFocusTarget(explicit);
          return;
        }
        const field = input.closest<HTMLElement>("[data-editor-field]")?.dataset
          .editorField;
        if (!field) {
          setFocusTarget(null);
          return;
        }
        const name = input.getAttribute("name");
        const part =
          name === "option"
            ? "option"
            : name === "optionDescription"
              ? "option-description"
              : name === "optionPrice"
                ? "price"
                : input.closest(".ProseMirror")
                  ? "description"
                  : "label";
        const index =
          name && ["option", "optionDescription", "optionPrice"].includes(name)
            ? Array.from(
                input.closest("form")?.querySelectorAll(`[name="${name}"]`) ??
                  [],
              ).indexOf(input)
            : -1;
        setFocusTarget(
          `field:${field}:${part}${index >= 0 ? `:${index}` : ""}`,
        );
      }}
      onBlurCapture={() => setFocusTarget(null)}
    >
      <form id={formId} action={action}>
        <input type="hidden" name="productId" value={product.id} />
        {mode === "form" ? (
          <>
            {sections
              .flatMap(([, values]) => Object.keys(values))
              .map((key) => (
                <input key={key} type="hidden" name={key} value={copy[key]} />
              ))}
            <input
              type="hidden"
              name="formPages"
              value={JSON.stringify(pages)}
            />
            {fields.map((field) => (
              <span key={field.id}>
                <input
                  type="hidden"
                  name={`group:${field.id}`}
                  value={fieldGroup(field, layoutCopy)}
                />
                <input
                  type="hidden"
                  name={`order:${field.id}`}
                  value={copy[`order:${field.id}`] ?? field.sort_order}
                />
                <input
                  type="hidden"
                  name={`placeholder:${field.id}`}
                  data-preview-target={`field:${field.id}:placeholder`}
                  value={copy[`placeholder:${field.id}`] ?? ""}
                />
              </span>
            ))}
          </>
        ) : null}
      </form>
      {mode === "form" ? (
        <>
          <div className="editor-section-heading">
            <div>
              <h2>예약 페이지 구성</h2>
              <p>
                상품 상세부터 접수 완료까지 페이지를 선택하고 고객 화면을
                편집합니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ImportFieldsButton
                productId={product.id}
                otherProducts={otherProducts}
                disabled={dirty || pending}
                onImported={(value) => {
                  setDraftPages(formPages(value));
                  setCopy(value);
                  setSavedCopy(JSON.stringify(value));
                  setSelected(formPages(value)[0].id);
                }}
              />
              <Button type="submit" form={formId} disabled={pending}>
                {pending ? "저장 중…" : "페이지 구성 저장"}
              </Button>
            </div>
          </div>
          <div className="form-builder-grid">
            <aside className="editor-card page-list">
              <h3>
                페이지 <span>{pages.length + 4}개</span>
              </h3>
              {[
                ["detail", "상품 상세"],
                ["times", "일정 선택"],
              ].map(([id, label]) => (
                <div
                  key={id}
                  className={`page-list-item ${stage === id ? "selected" : ""}`}
                >
                  <button
                    type="button"
                    className="page-select"
                    aria-pressed={stage === id}
                    onClick={() => setStage(id as "detail" | "times")}
                  >
                    <span>
                      <b>{label}</b>
                      <small>상품별 안내 · 고정 단계</small>
                    </span>
                  </button>
                </div>
              ))}
              <h4 className="editor-help">신청서</h4>
              {pages.map((p, index) => {
                const assigned = fields.filter(
                  (f) => fieldGroup(f, layoutCopy) === p.id,
                );
                return (
                  <div
                    key={p.id}
                    className={`page-list-item ${stage === "form" && page.id === p.id ? `selected ${focusTarget === "page:name" ? "preview-page-focus" : ""}` : ""}`}
                  >
                    <button
                      type="button"
                      className="page-select"
                      onClick={() => {
                        setStage("form");
                        setSelected(p.id);
                      }}
                      aria-pressed={stage === "form" && page.id === p.id}
                    >
                      <span className="page-number">{index + 1}</span>
                      <span>
                        <b>{p.label}</b>
                        <small>
                          {assigned.map((f) => f.label).join(" · ") ||
                            "문항 없음"}
                        </small>
                      </span>
                      <span className="page-count">{assigned.length}</span>
                    </button>
                    <button
                      type="button"
                      className="page-remove"
                      aria-label={`${p.label} 페이지 삭제`}
                      disabled={pages.length <= 1}
                      onClick={() => deletePage(p.id)}
                    >
                      삭제
                    </button>
                  </div>
                );
              })}
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setStage("form");
                  addPage();
                }}
                disabled={pages.length >= MAX_FORM_PAGES}
              >
                ＋ 페이지 추가
              </Button>
              <p className="editor-help">
                문항이 없는 페이지는 고객 화면에서 건너뜁니다.
              </p>
              <hr />
              {[
                ["review", "최종 확인"],
                ["success", "접수 완료"],
              ].map(([id, label]) => (
                <div
                  key={id}
                  className={`page-list-item ${stage === id ? "selected" : ""}`}
                >
                  <button
                    type="button"
                    className="page-select"
                    aria-pressed={stage === id}
                    onClick={() => setStage(id as "review" | "success")}
                  >
                    <span>
                      <b>{label}</b>
                      <small>상품별 안내 · 고정 단계</small>
                    </span>
                  </button>
                </div>
              ))}
            </aside>
            <div className="editor-card page-editor">
              {stage === "form" ? (
                <>
                  <div className="editor-section-heading">
                    <div>
                      <small>
                        PAGE {String(pages.indexOf(page) + 1).padStart(2, "0")}
                      </small>
                      <h2>{page.label}</h2>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        aria-label="페이지 위로"
                        disabled={pages.indexOf(page) === 0}
                        onClick={() => movePage(-1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label="페이지 아래로"
                        disabled={pages.indexOf(page) === pages.length - 1}
                        onClick={() => movePage(1)}
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                  <Field label="페이지 이름">
                    <input
                      className={inputClass}
                      data-preview-target="page:name"
                      value={page.label}
                      maxLength={80}
                      onChange={(e) => updatePage("label", e.target.value)}
                    />
                  </Field>
                  <Field label="고객 화면의 페이지 제목">
                    <input
                      className={inputClass}
                      data-preview-target="page:title"
                      value={page.title}
                      maxLength={1000}
                      onChange={(e) => updatePage("title", e.target.value)}
                    />
                  </Field>
                  <Field label="페이지 설명 (비우면 숨김)">
                    <textarea
                      className={inputClass}
                      rows={2}
                      data-preview-target="page:intro"
                      value={page.intro}
                      maxLength={1000}
                      onChange={(e) => updatePage("intro", e.target.value)}
                    />
                  </Field>
                  <div className="editor-section-heading">
                    <h3>이 페이지의 문항</h3>
                    <FieldModal
                      productId={product.id}
                      onSaved={(id) =>
                        setCopy((current) => ({
                          ...current,
                          [`group:${id}`]: String(page.id),
                        }))
                      }
                    />
                  </div>
                  {pageFields.map((field, index) => (
                    <article
                      className="builder-question"
                      key={field.id}
                      data-editor-field={field.id}
                    >
                      <div className="builder-question-heading">
                        <div>
                          <b>{field.label}</b>
                          <small>
                            {FIELD_TYPE_LABELS[field.type]} ·{" "}
                            {field.required ? "필수" : "선택"}
                            {!field.active ? " · 비활성" : ""}
                          </small>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-label={`${field.label} 위로`}
                            onClick={() => moveField(field.id, -1)}
                            disabled={!index}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            aria-label={`${field.label} 아래로`}
                            onClick={() => moveField(field.id, 1)}
                            disabled={index === pageFields.length - 1}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            aria-label={`${field.label} 편집`}
                            onClick={() =>
                              setEditingFieldId(
                                editingFieldId === field.id ? null : field.id,
                              )
                            }
                          >
                            {editingFieldId === field.id ? "닫기" : "편집"}
                          </button>
                        </div>
                      </div>
                      {editingFieldId === field.id ? (
                        <FieldModal
                          inline
                          onCancel={() => setEditingFieldId(null)}
                          productId={product.id}
                          field={field}
                          onSaved={() => setEditingFieldId(null)}
                        />
                      ) : null}
                      {field.description ? (
                        <FieldDescription html={field.description} />
                      ) : null}
                      {field.options?.map((option, i) => (
                        <div
                          className="builder-option"
                          key={`${field.id}-${i}`}
                        >
                          <div>
                            {option}
                            <b>
                              {field.option_prices?.[i]
                                ? `+${field.option_prices[i].toLocaleString()}원`
                                : ""}
                            </b>
                          </div>
                          {field.option_descriptions?.[i] ? (
                            <p>{field.option_descriptions[i]}</p>
                          ) : null}
                        </div>
                      ))}
                      {[
                        "name",
                        "phone",
                        "email",
                        "birth_date",
                        "short_text",
                        "long_text",
                      ].includes(field.type) ? (
                        <Field label="입력 예시">
                          <input
                            className={inputClass}
                            data-preview-target={`field:${field.id}:placeholder`}
                            value={copy[`placeholder:${field.id}`] ?? ""}
                            maxLength={200}
                            placeholder="비우면 기본 입력 예시"
                            onChange={(e) =>
                              setCopy({
                                ...copy,
                                [`placeholder:${field.id}`]: e.target.value,
                              })
                            }
                          />
                        </Field>
                      ) : null}
                      <div className="builder-question-footer">
                        <label>
                          배치 페이지
                          <select
                            aria-label={`${field.label} 배치 페이지`}
                            className={inputClass}
                            value={page.id}
                            onChange={(e) =>
                              setCopy({
                                ...copy,
                                [`group:${field.id}`]: e.target.value,
                              })
                            }
                          >
                            {pages.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <DeleteFieldButton
                          id={field.id}
                          productId={product.id}
                          label={field.label}
                          locked={LOCKED_FIELD_TYPES.includes(
                            field.type as "name" | "phone",
                          )}
                        />
                      </div>
                    </article>
                  ))}
                  {!pageFields.length ? (
                    <p className="editor-help">
                      문항을 추가하거나 다른 페이지에서 이동할 수 있습니다.
                    </p>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="editor-section-heading">
                    <div>
                      <small>고정 단계</small>
                      <h2>
                        {stage === "detail"
                          ? "상품 상세"
                          : stage === "times"
                            ? "일정 선택"
                            : stage === "review"
                              ? "최종 확인"
                              : "접수 완료"}
                      </h2>
                    </div>
                  </div>
                  <p className="editor-help">
                    이 상품의 고객 화면에 표시되는 내용을 편집합니다. 제목·안내
                    문구를 바꾸어도 예약 절차는 유지됩니다.
                  </p>
                  {Object.entries(stageSection[1]).map(([key, value]) => (
                    <Field key={key} label={COPY_LABELS[key] ?? value}>
                      <textarea
                        data-preview-target={`copy:${key}`}
                        aria-label={COPY_LABELS[key] ?? value}
                        maxLength={1000}
                        value={copy[key]}
                        onChange={(e) =>
                          setCopy({ ...copy, [key]: e.target.value })
                        }
                        rows={2}
                        className={inputClass}
                      />
                    </Field>
                  ))}
                  {stage === "detail" ? (
                    <p className="editor-help">
                      상품명·가격·이미지·서식 상세 설명은 상품 정보 탭에서
                      수정합니다.
                    </p>
                  ) : null}
                </>
              )}
            </div>
            <aside className="builder-preview">
              <div className="editor-section-heading">
                <h3>고객 화면 미리보기</h3>
                <select
                  aria-label="미리보기 화면 크기"
                  value={desktop ? "desktop" : "mobile"}
                  onChange={(e) => setDesktop(e.target.value === "desktop")}
                >
                  <option value="mobile">모바일</option>
                  <option value="desktop">데스크톱</option>
                </select>
              </div>
              <FormLivePreview
                src={previewSrc}
                desktop={desktop}
                data={{
                  product,
                  fields,
                  copy: layoutCopy,
                  group: page.id,
                  stage,
                  focusTarget,
                  bankAccount,
                  notice,
                  depositRequired,
                }}
              />
              <p className="editor-help">
                실제 고객 페이지를 표시합니다. 예시 일정을 사용하며 예약은
                접수하지 않습니다.
              </p>
            </aside>
          </div>
          <div className="editor-common-note">
            모든 상품에 공통 적용 · 페이지 전환 · 자동 이동 · 입력 검증 · 키패드
            대응 · 답변 복원
          </div>
        </>
      ) : (
        <h2 className="mb-4 text-lg font-bold">상품 상세 안내 문구</h2>
      )}
      {mode === "details" ? (
        <details
          className="editor-card booking-copy-settings"
          open={mode === "details"}
        >
          <summary>
            {mode === "details"
              ? "가격·신청 절차 안내"
              : "일정 선택·내용 확인·접수 완료 안내"}
          </summary>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {sections.map(([label, values]) => (
              <fieldset key={label} className="space-y-3">
                <legend className="mb-3 font-bold">{label}</legend>
                {Object.entries(values).map(([key, defaultValue]) => (
                  <Field key={key} label={COPY_LABELS[key] ?? defaultValue}>
                    <textarea
                      form={formId}
                      name={key}
                      maxLength={1000}
                      value={copy[key]}
                      onChange={(e) =>
                        setCopy({ ...copy, [key]: e.target.value })
                      }
                      rows={2}
                      className={inputClass}
                    />
                  </Field>
                ))}
              </fieldset>
            ))}
          </div>
        </details>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          const next = { ...copy };
          for (const [, values] of sections)
            for (const key of Object.keys(values))
              next[key] = DEFAULT_COPY[key];
          if (mode === "form") {
            const defaults = formPages(resolveCopy(null));
            const resetPages = pages.map((page) =>
              defaults.find((p) => p.id === page.id)
                ? {
                    ...page,
                    title: defaults[page.id].title,
                    intro: defaults[page.id].intro,
                  }
                : page,
            );
            setDraftPages(resetPages);
            setCopy(copyWithPages(next, resetPages));
          } else setCopy(next);
        }}
      >
        기본 안내 문구 복원
      </Button>
      <div className="editor-save-bar">
        <span>
          {dirty
            ? "저장하지 않은 변경사항이 있습니다."
            : "저장된 설정을 표시합니다."}{" "}
          문항 수정·추가·삭제는 각각 저장됩니다.
        </span>
        <Button type="submit" form={formId} disabled={pending}>
          {pending
            ? "저장 중…"
            : mode === "details"
              ? "상품 안내 문구 저장"
              : "페이지 구성 저장"}
        </Button>
      </div>
      <ErrorText>{state?.error}</ErrorText>
      {state?.success ? (
        <p role="status" className="text-sm text-green-700">
          저장했습니다.
        </p>
      ) : null}
    </section>
  );
}
