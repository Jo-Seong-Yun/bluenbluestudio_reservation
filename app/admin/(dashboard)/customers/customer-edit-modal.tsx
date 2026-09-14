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

        <form action={action} className="space-y-4 p-5">
          <input type="hidden" name="originalPhone" value={customer.phone} />

          {/* 아래 필드 순서는 고객DB 목록의 열 순서(고객성명/연령/성별/
              연락처/메일주소)와 맞춘다 — "연령"은 직접 입력하는 값이
              아니라 생년월일에서 계산되므로, 그 자리에 생년월일을 둔다. */}
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
