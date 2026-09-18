"use client";

import { useRef } from "react";
import { importCustomFieldsFromProduct } from "@/app/admin/actions";
import { Button, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

/**
 * 다른 상품에서 만들어 둔 문항(예: "추가옵션(유료)")을 그대로 복사해
 * 지금 상품 맨 끝에 이어 붙인다. 비슷한 상품을 새로 만들 때마다 옵션과
 * 가격을 손으로 다시 입력하지 않아도 되게 하려는 용도다.
 *
 * 이름·연락처처럼 상품마다 이미 하나씩 있는 기본 문항은 복사 대상에서
 * 빠진다(서버 액션 쪽에서 걸러낸다) — 여기서는 그 사실을 안내만 한다.
 */
export function ImportFieldsButton({
  productId,
  otherProducts,
}: {
  productId: string;
  otherProducts: { id: string; name: string }[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  if (otherProducts.length === 0) return null;

  function open() {
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      <Button type="button" variant="ghost" onClick={open}>
        다른 상품에서 가져오기
      </Button>

      <dialog
        ref={dialogRef}
        className="border-border bg-surface text-foreground w-[calc(100%-2rem)] max-w-md rounded-xl border p-0 backdrop:bg-black/50"
      >
        <div className="flex items-center justify-between border-b border-inherit px-5 py-4">
          <p className="font-bold">다른 상품에서 문항 가져오기</p>
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
          action={importCustomFieldsFromProduct}
          onSubmit={close}
          className="space-y-4 p-5"
        >
          <input type="hidden" name="targetProductId" value={productId} />

          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              htmlFor="sourceProductId"
            >
              어느 상품에서 가져올까요?
            </label>
            <select
              id="sourceProductId"
              name="sourceProductId"
              required
              defaultValue=""
              className={inputClass}
            >
              <option value="" disabled>
                상품 선택
              </option>
              {otherProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <p className="text-muted text-xs">
            이름·연락처·이메일·성별·생년월일처럼 상품마다 이미 있는 기본
            문항은 제외하고, 나머지 활성화된 문항만 복사해 지금 상품 맨
            끝에 추가합니다. 고른 상품의 문항은 그대로 남고 바뀌지
            않습니다.
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={close}>
              취소
            </Button>
            <SubmitButton>가져오기</SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
