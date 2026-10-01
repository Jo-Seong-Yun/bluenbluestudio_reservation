export const REVENUE_PAGE_SIZE = 500;

/** 연간 예약·지출이 API 응답 한도를 넘겨도 실제 반환한 행 수부터 이어 읽는다. */
export async function readAllRevenueRows<T>(
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: T[] | null;
    error: unknown;
    count: number | null;
  }>,
): Promise<T[]> {
  const rows: T[] = [];
  while (true) {
    const { data, error, count } = await fetchPage(
      rows.length,
      rows.length + REVENUE_PAGE_SIZE - 1,
    );
    if (error || !data)
      throw new Error("매출 집계 데이터를 불러오지 못했습니다.");
    if (data.length === 0) {
      if (count !== null && rows.length < count) {
        throw new Error("매출 집계 데이터 일부를 불러오지 못했습니다.");
      }
      return rows;
    }
    rows.push(...data);
    if (
      count !== null ? rows.length >= count : data.length < REVENUE_PAGE_SIZE
    ) {
      return rows;
    }
  }
}
