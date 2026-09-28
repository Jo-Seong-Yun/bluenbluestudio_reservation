"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import {
  createCustomer,
  type CreateCustomerState,
} from "@/app/admin/actions";
import { Button, ErrorText, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

const initialState: CreateCustomerState = { status: "idle" };

/**
 * 예약 없이 손님을 고객DB에 수기로 새로 등록하는 모달. 필드 구성은
 * CustomerEditModal(수정)과 맞추되, 연락처가 이미 등록돼 있으면
 * 서버 액션(createCustomer)이 거절한다 — 기존 손님 값을 덮어쓰는
 * 용도가 아니라 새 손님을 만드는 용도이기 때문이다.
 */
export function CustomerAddModal() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(createCustomer, initialState);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      dialogRef.current?.close();
    }
  }, [state]);

  function open() {
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      <Button type="button" onClick={open}>
        손님 추가
      </Button>

      <dialog
        ref={dialogRef}
        className="border-border bg-surface text-foreground w-[calc(100%-2rem)] max-w-md rounded-xl border p-0 backdrop:bg-black/50"
        style={{ maxHeight: "90vh" }}
      >
        <div className="flex items-center justify-between border-b border-inherit px-5 py-4">
          <p className="font-bold">손님 추가</p>
          <button
            type="button"
            onClick={close}
            aria-label="닫기"
            className="text-muted hover:text-foreground text-lg leading-none"
          >
            ×
          </button>
        </div>

        <form
          ref={formRef}
          action={action}
          className="space-y-4 overflow-y-auto p-5"
          style={{ maxHeight: "calc(90vh - 57px)" }}
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="add-name">
              이름 <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input id="add-name" name="name" required maxLength={50} className={inputClass} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="add-birthDate">
              생년월일
            </label>
            <input id="add-birthDate" name="birthDate" type="date" className={inputClass} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="add-ageOverride">
              연령 직접입력
            </label>
            <input
              id="add-ageOverride"
              name="ageOverride"
              type="number"
              min={0}
              placeholder="생년월일이 없을 때만 사용됩니다"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="add-gender">
              성별
            </label>
            <select id="add-gender" name="gender" defaultValue="" className={inputClass}>
              <option value="">선택 안 함</option>
              <option value="male">남</option>
              <option value="female">여</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="add-phone">
              연락처 <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              id="add-phone"
              name="phone"
              required
              inputMode="numeric"
              placeholder="01012345678"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="add-email">
              이메일
            </label>
            <input id="add-email" name="email" type="email" className={inputClass} />
          </div>

          <div className="border-border border-t pt-4">
            <p className="text-sm font-medium">방문 이력 직접 입력</p>
            <p className="text-muted mt-0.5 mb-3 text-xs">
              예약 없이 등록하는 손님이라 자동 계산할 방문 기록이 없습니다.
              필요하면 직접 채워 넣으세요(비워두면 0회로 표시됩니다).
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="add-firstVisitOverride">
                  첫방문일
                </label>
                <input
                  id="add-firstVisitOverride"
                  name="firstVisitOverride"
                  type="date"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="add-lastVisitOverride">
                  최근방문일
                </label>
                <input
                  id="add-lastVisitOverride"
                  name="lastVisitOverride"
                  type="date"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="add-visitCountOverride">
                  총방문횟수
                </label>
                <input
                  id="add-visitCountOverride"
                  name="visitCountOverride"
                  type="number"
                  min={0}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="add-snsConsentOverride">
                  SNS 업로드 동의
                </label>
                <select
                  id="add-snsConsentOverride"
                  name="snsConsentOverride"
                  defaultValue=""
                  className={inputClass}
                >
                  <option value="">자동 계산</option>
                  <option value="동의">동의</option>
                  <option value="비동의">비동의</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="add-collectedAt">
              정보수집일
            </label>
            <input
              id="add-collectedAt"
              name="collectedAt"
              type="date"
              placeholder="비워두면 오늘 날짜로 저장됩니다"
              className={inputClass}
            />
          </div>

          {state.status === "error" ? <ErrorText>{state.error}</ErrorText> : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={close}>
              취소
            </Button>
            <SubmitButton>추가</SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
