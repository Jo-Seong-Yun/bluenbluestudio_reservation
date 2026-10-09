const DRAFT_PREFIX = "booking-draft:v1:";
export const draftStorageKey = (productId: string) =>
  `${DRAFT_PREFIX}${productId}`;
export const answerDrafts = new Map<string, Record<string, string[]>>();

/** 상품 선택으로 돌아오면 모든 상품의 작성 중인 답변과 페이지를 비웁니다. */
export function clearBookingDrafts(storage?: Storage) {
  answerDrafts.clear();
  try {
    const target = storage ?? window.sessionStorage;
    for (let index = target.length - 1; index >= 0; index--) {
      const key = target.key(index);
      if (key?.startsWith(DRAFT_PREFIX)) target.removeItem(key);
    }
  } catch {
    // 저장소 접근이 막혀 있어도 메모리의 답변은 초기화합니다.
  }
}
