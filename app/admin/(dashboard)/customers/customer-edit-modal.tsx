"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import {
  updateCustomer,
  type UpdateCustomerState,
} from "@/app/admin/actions";
import { Button, ErrorText, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import type { CustomerSummary } from "@/lib/customers";
import { kstDateString } from "@/lib/time";

const initialState: UpdateCustomerState = { status: "idle" };

/**
 * 고객 인적사항 수기 수정 모달. 연락처를 포함해 전부 고칠 수 있다 —
 * 연락처를 바꾸면 서버 액션(updateCustomer)이 그 손님의 기존 예약
 * 기록도 함께 새 번호로 옮겨, 방문 이력이 끊기지 않게 한다.
 */
export function CustomerEditModal({ customer }: { customer: CustomerSummary }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, action] = useActionState(updateCustomer, initialState);

  // 저장이 실패하면 오류 문구를 보여줘야 하니 제출한다고 바로 닫지
  // 않는다 — 실제로 성공했을 때만(revalidatePath로 최신 값이 이미
  // 반영된 뒤) 닫는다.
  useEffect(() => {
    if (state.status === "success") {
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
      <button
        type="button"
        onClick={open}
        aria-label={`${customer.name} 정보 수정`}
        className="border-border hover:bg-surface-subtle flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm"
      >
        ✎
      </button>

      <dialog
        ref={dialogRef}
        className="border-border bg-surface text-foreground w-[calc(100%-2rem)] max-w-md rounded-xl border p-0 backdrop:bg-black/50"
        style={{ maxHeight: "90vh" }}
      >
        <div className="flex items-center justify-between border-b border-inherit px-5 py-4">
          <p className="font-bold">고객 정보 수정</p>
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
          action={action}
          className="space-y-4 overflow-y-auto p-5"
          style={{ maxHeight: "calc(90vh - 57px)" }}
        >
          <input type="hidden" name="originalPhone" value={customer.phone} />

          {/* 아래 필드 순서는 고객DB 목록의 열 순서(고객성명/연령/성별/
              연락처/메일주소)와 대략 맞춘다 — "연령"은 생년월일이 있으면
              거기서 계산하므로, 생년월일 바로 다음에 "연령 직접입력"
              (생년월일 없을 때만 쓰는 값)을 둔다. */}
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="name">
              이름 <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              id="name"
              name="name"
              required
              maxLength={50}
              defaultValue={customer.name}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="birthDate">
              생년월일
            </label>
            <input
              id="birthDate"
              name="birthDate"
              type="date"
              defaultValue={customer.birthDate ?? ""}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="ageOverride">
              연령 직접입력
            </label>
            <input
              id="ageOverride"
              name="ageOverride"
              type="number"
              min={0}
              defaultValue={customer.ageOverride ?? ""}
              placeholder="생년월일이 없을 때만 사용됩니다"
              className={inputClass}
            />
            <p className="text-muted mt-1 text-xs">
              생년월일을 입력하면 이 칸은 무시되고 생년월일로 계산한 나이가 쓰입니다.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="gender">
              성별
            </label>
            <select
              id="gender"
              name="gender"
              defaultValue={customer.gender ?? ""}
              className={inputClass}
            >
              <option value="">선택 안 함</option>
              <option value="male">남</option>
              <option value="female">여</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="phone">
              연락처 <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              id="phone"
              name="phone"
              required
              inputMode="numeric"
              defaultValue={customer.phone}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="email">
              이메일
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={customer.email ?? ""}
              className={inputClass}
            />
          </div>

          <div className="border-border border-t pt-4">
            <p className="text-sm font-medium">방문 이력 직접 입력</p>
            <p className="text-muted mt-0.5 mb-3 text-xs">
              비워두면 예약 기록으로 자동 계산됩니다. 값을 입력하면 그 값을
              그대로 보여줍니다(예약이 없는 손님의 방문 이력을 직접
              기록할 때 씁니다).
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="firstVisitOverride">
                  첫방문일
                </label>
                <input
                  id="firstVisitOverride"
                  name="firstVisitOverride"
                  type="date"
                  defaultValue={customer.firstVisitOverride ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="lastVisitOverride">
                  최근방문일
                </label>
                <input
                  id="lastVisitOverride"
                  name="lastVisitOverride"
                  type="date"
                  defaultValue={customer.lastVisitOverride ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="visitCountOverride">
                  총방문횟수
                </label>
                <input
                  id="visitCountOverride"
                  name="visitCountOverride"
                  type="number"
                  min={0}
                  defaultValue={customer.visitCountOverride ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="snsConsentOverride">
                  SNS 업로드 동의
                </label>
                <select
                  id="snsConsentOverride"
                  name="snsConsentOverride"
                  defaultValue={customer.snsConsentOverride ?? ""}
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
            <label className="mb-1.5 block text-sm font-medium" htmlFor="collectedAt">
              정보수집일
            </label>
            <input
              id="collectedAt"
              name="collectedAt"
              type="date"
              defaultValue={kstDateString(new Date(customer.collectedAt))}
              className={inputClass}
            />
          </div>

          {state.status === "error" ? <ErrorText>{state.error}</ErrorText> : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={close}>
              취소
            </Button>
            <SubmitButton>저장</SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
