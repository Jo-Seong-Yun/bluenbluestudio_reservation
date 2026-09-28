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

        <form ref={formRef} action={action} className="space-y-4 p-5">
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
