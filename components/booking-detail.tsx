import Link from "next/link";
import { RichText } from "@/components/rich-text";
export type BookingDetailProduct = {
  name: string;
  slug: string;
  duration_min: number;
  max_people: number | null;
  price: number;
  sale_price: number | null;
  description: string | null;
  delivery_note: string | null;
};
export function BookingDetail({
  product,
  earliestBookable,
  latestBookable,
}: {
  product: BookingDetailProduct;
  earliestBookable: string;
  latestBookable: string;
}) {
  return (
    <main className="booking-page">
      <Link href="/booking" className="text-muted mb-4 inline-block text-sm">
        ← 상품 목록
      </Link>

      <div className="booking-split">
        <article className="booking-card">
          <p className="text-brand text-xs font-bold">촬영 상품 안내</p>
          <h1 className="mt-3 text-3xl font-bold">{product.name}</h1>
          <p className="text-muted mt-3 text-sm">
            촬영 {product.duration_min}분
            {product.max_people ? ` · 최대 ${product.max_people}명` : ""}
          </p>
          <div className="booking-product-description border-border mt-6 border-t pt-6">
            <h2 className="mb-4 text-lg font-bold">상세 내용</h2>
            {product.description ? (
              <RichText>{product.description}</RichText>
            ) : (
              <p className="text-muted text-sm">
                상품 상세 안내를 준비하고 있습니다.
              </p>
            )}
          </div>
          {product.delivery_note ? (
            <div className="border-border mt-6 border-t pt-6">
              <h2 className="mb-3 text-lg font-bold">결과물 안내</h2>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {product.delivery_note}
              </p>
            </div>
          ) : null}
        </article>
        <aside className="booking-card booking-summary">
          <p className="text-brand text-xs font-bold">예약 요약</p>
          <h2>{product.name}</h2>
          <p className="text-muted text-sm">
            촬영 {product.duration_min}분
            {product.max_people ? ` · 최대 ${product.max_people}명` : ""}
          </p>
          {product.sale_price != null ? (
            <p className="text-muted mt-5 text-sm line-through">
              {product.price.toLocaleString()}원
            </p>
          ) : null}
          <div className="booking-summary-total">
            <span>
              {product.sale_price != null ? "할인 요금" : "기본 요금"}
            </span>
            <strong>
              {(product.sale_price ?? product.price).toLocaleString()}원
            </strong>
          </div>
          <p className="text-muted mt-4 text-xs leading-relaxed">
            {earliestBookable}부터 {latestBookable}까지 예약할 수 있습니다.
          </p>
          <Link
            href={`/booking/${product.slug}?step=times`}
            className="bg-brand hover:bg-brand-hover mt-5 flex min-h-12 items-center justify-center rounded-md px-3 py-3 text-sm font-bold text-white"
          >
            희망 시간 선택하기 →
          </Link>
          <p className="text-muted mt-4 text-xs">
            희망 시간을 3개 선택합니다. 최종 일정은 스튜디오에서 확정해
            드립니다.
          </p>
        </aside>
      </div>
    </main>
  );
}
