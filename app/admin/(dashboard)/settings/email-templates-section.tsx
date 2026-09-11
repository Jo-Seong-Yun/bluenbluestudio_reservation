"use client";

import { useActionState, useRef, useState } from "react";
import { saveEmailTemplate, type SettingsActionState } from "@/app/admin/actions";
import { Button, ErrorText, inputClass } from "@/components/ui";
import { useReportPending } from "@/components/pending-overlay";
import {
  DEFAULT_EMAIL_TEMPLATES,
  EMAIL_TEMPLATE_LABELS,
  EMAIL_TEMPLATE_PREVIEW_VALUES,
  EMAIL_TEMPLATE_PURPOSES,
  EMAIL_TEMPLATE_VARIABLES,
  renderEmailTemplate,
  type EmailTemplate,
  type EmailTemplatePurpose,
} from "@/lib/notifications/email-templates-shared";

const initialActionState: SettingsActionState = null;

/**
 * 이메일 문구(제목/본문) 편집. 목적(접수/확정/취소/리마인드/사장님
 * 알림) 5개를 탭으로 나눠 하나씩 고친다.
 *
 * 본문 안에 {{이름}}, {{상품명}} 같은 자리표시자를 쓰면 발송 직전에
 * 실제 값으로 자동 치환된다(lib/notifications/notify.ts) — "변수를
 * 쓰면 자동화되는" 부분이 이거다. 오른쪽 변수 칩을 누르면 마지막으로
 * 포커스했던 칸(제목 또는 본문)의 커서 위치에 바로 끼워 넣어준다.
 */
export function EmailTemplatesSection({
  initial,
}: {
  initial: Record<EmailTemplatePurpose, EmailTemplate>;
}) {
  const [purpose, setPurpose] = useState<EmailTemplatePurpose>(
    EMAIL_TEMPLATE_PURPOSES[0],
  );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-bold">이메일 문구 설정</h2>
        <p className="text-muted mt-1 text-xs">
          손님·사장님에게 나가는 이메일 제목과 본문을 직접 고칠 수 있어요.{" "}
          <code className="bg-surface-subtle rounded px-1">
            {"{{변수}}"}
          </code>{" "}
          형태로 쓰면 발송할 때 실제 값(이름, 시간 등)으로 자동 채워져요.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist">
        {EMAIL_TEMPLATE_PURPOSES.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={p === purpose}
            onClick={() => setPurpose(p)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              p === purpose
                ? "bg-brand text-brand-foreground border-brand"
                : "border-border hover:bg-surface-subtle"
            }`}
          >
            {EMAIL_TEMPLATE_LABELS[p]}
          </button>
        ))}
      </div>

      {/* key로 purpose마다 새로 마운트해, 탭을 바꾸면 편집 상태(제목/본문
          입력값)가 그 목적의 초기값으로 깔끔하게 리셋되게 한다. */}
      <TemplateEditor
        key={purpose}
        purpose={purpose}
        initial={initial[purpose]}
      />
    </section>
  );
}

function TemplateEditor({
  purpose,
  initial,
}: {
  purpose: EmailTemplatePurpose;
  initial: EmailTemplate;
}) {
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const lastFocused = useRef<"subject" | "body">("body");

  const [state, action, pending] = useActionState<SettingsActionState, FormData>(
    saveEmailTemplate,
    initialActionState,
  );
  useReportPending(pending);

  const variables = EMAIL_TEMPLATE_VARIABLES[purpose];
  const previewSubject = renderEmailTemplate(
    subject,
    EMAIL_TEMPLATE_PREVIEW_VALUES[purpose],
  );
  const previewBody = renderEmailTemplate(
    body,
    EMAIL_TEMPLATE_PREVIEW_VALUES[purpose],
  );

  function insertVariable(key: string) {
    const placeholder = `{{${key}}}`;
    const target = lastFocused.current === "subject" ? subjectRef.current : bodyRef.current;

    if (!target) {
      // 아직 아무 칸도 포커스한 적 없으면 본문 맨 끝에 붙인다.
      setBody((prev) => prev + placeholder);
      return;
    }

    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    const next = target.value.slice(0, start) + placeholder + target.value.slice(end);

    if (target === subjectRef.current) setSubject(next);
    else setBody(next);

    requestAnimationFrame(() => {
      target.focus();
      const cursor = start + placeholder.length;
      target.setSelectionRange(cursor, cursor);
    });
  }

  function resetToDefault() {
    const fallback = DEFAULT_EMAIL_TEMPLATES[purpose];
    setSubject(fallback.subject);
    setBody(fallback.body);
  }

  return (
    <div className="border-border bg-surface space-y-4 rounded-xl border p-4">
      <form action={action} className="space-y-3">
        <input type="hidden" name="purpose" value={purpose} />

        <div>
          <label className="mb-1 block text-xs font-medium">제목</label>
          <input
            ref={subjectRef}
            name="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onFocus={() => (lastFocused.current = "subject")}
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium">본문</label>
          <textarea
            ref={bodyRef}
            name="body"
            rows={10}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onFocus={() => (lastFocused.current = "body")}
            className={`${inputClass} font-mono text-xs leading-relaxed`}
          />
        </div>

        <div>
          <p className="text-muted mb-1.5 text-xs font-medium">
            사용 가능한 변수 (눌러서 커서 위치에 삽입)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {variables.map((v) => (
              <button
                key={v.key}
                type="button"
                title={v.description}
                onClick={() => insertVariable(v.key)}
                className="border-border bg-surface-subtle hover:bg-brand hover:text-brand-foreground hover:border-brand rounded-md border px-2 py-1 font-mono text-xs transition-colors"
              >
                {`{{${v.key}}}`}
              </button>
            ))}
          </div>
        </div>

        <ErrorText>{state?.error ?? null}</ErrorText>
        {state?.success ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            저장했어요.
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "저장 중…" : "이 문구 저장"}
          </Button>
          <Button type="button" variant="ghost" onClick={resetToDefault}>
            기본값으로 되돌리기
          </Button>
        </div>
      </form>

      <div className="border-border border-t pt-3">
        <p className="text-muted mb-1.5 text-xs font-medium">
          미리보기 (예시 값으로 채워본 모습)
        </p>
        <div className="border-border bg-surface-subtle rounded-lg border p-3 text-sm">
          <p className="font-medium">{previewSubject}</p>
          <p className="text-muted mt-2 whitespace-pre-wrap">{previewBody}</p>
        </div>
      </div>
    </div>
  );
}
