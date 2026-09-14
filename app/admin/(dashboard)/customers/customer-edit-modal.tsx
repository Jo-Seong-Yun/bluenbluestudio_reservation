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
 * 고객 인적사항 수기 수정 모달. 연락처(phone)는 예약 기록과 이 손님을
 * 이어주는 식별자라 여기서 바꾸지 않는다 — 바꾸면 그 뒤로 들어오는
 * 예약이 새 손님으로 갈라져 잡힌다.
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
          <input type="hidden" name="phone" value={customer.phone} />

          <div>
            <span className="mb-1.5 block text-sm font-medium">연락처</span>
            <p className="border-border bg-surface-subtle text-muted rounded-lg border px-3 py-2 text-sm">
              {customer.phone} (바꿀 수 없습니다)
            </p>
          </div>

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
              <option value="male">남성</option>
              <option value="female">여성</option>
            </select>
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
