import {depositContent} from "@/lib/booking/deposit-content";
import Link from "next/link";
import { RichText } from "@/components/rich-text";
import { resolveCopy, type BookingCopy } from "@/lib/booking/copy";
export type BookingDetailProduct = {
  name: string;
  slug: string;
  duration_min: number;
  max_people: number | null;
  price: number;
  sale_price: number | null;
  description: string | null;
  delivery_note: string | null;
  summary?: string | null;
};
export function BookingDetail({
  product,
  earliestBookable,
  latestBookable,
  copy: raw,
  depositRequired = true,
}: {
  product: BookingDetailProduct;
  earliestBookable: string;
  latestBookable: string;
  copy?: BookingCopy;
  depositRequired?: boolean;
}) {
  const copy = resolveCopy(raw);
  const sale =
    product.sale_price !== null && product.sale_price < product.price;
  const price = product.sale_price ?? product.price;
  return (
    <main className="booking-page booking-modern-detail">
      <Link href="/booking" className="booking-back">
        ← 상품 목록
      </Link>
      <p className="booking-eyebrow">푸르른 스튜디오 · 촬영 상품</p>
      <h1>{product.name}</h1>
      <p className="booking-lead">
        {raw?.detailIntro ?? product.summary ?? copy.detailIntro}
      </p>
      <div className="booking-unified-card">
        <section className="booking-price-section">
          <div className="booking-price-top">
            <strong>{product.name}</strong>
            {sale ? (
              <span className="booking-sale">
                {Math.round((1 - price / product.price) * 100)}% 할인
              </span>
            ) : null}
          </div>
          <p className="booking-lead">
            촬영 {product.duration_min}분
            {product.max_people ? ` · 최대 ${product.max_people}명` : ""}
          </p>
          {sale ? (
            <del className="booking-old-price">
              {product.price.toLocaleString()}원
            </del>
          ) : null}
          <p className="booking-large-price">
            {price.toLocaleString()}
            <small>원</small>
            <span>기본 촬영 가격</span>
          </p>
          <p className="booking-small-copy booking-close-note">
            {copy.priceNote}
          </p>
        </section>
        <section className="booking-process">
          <h2>{copy.processTitle}</h2>
          <ol>
            {[1, 2, 3].map((n) => (
              <li key={n}>
                <span>0{n}</span>
                <div>
                  <strong>{copy[`process${n}Title`]}</strong>
                  <p>{copy[`process${n}Body`]}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="booking-small-copy">
            희망 시간 신청만으로 일정이 확정되지 않습니다.
            {depositRequired ? <><br/>확정 안내 전에는 입금하지 않습니다.</> : null}
          </p>
        </section>
      </div>
      {product.description ? (
        <section className="booking-extra-description booking-detail-description-card">
          <h2>상세 내용</h2>
          <RichText>{depositContent(product.description,depositRequired)}</RichText>
        </section>
      ) : null}
      {product.delivery_note ? (
        <section className="booking-extra-description">
          <h2>결과물 안내</h2>
          <p>{product.delivery_note}</p>
        </section>
      ) : null}
      <p className="booking-small-copy">
        {earliestBookable}부터 {latestBookable}까지 예약할 수 있습니다.
      </p>
      <div className="booking-primary-dock">
        <Link
          href={`/booking/${product.slug}?step=times`}
          className="booking-primary"
        >
          예약 가능한 날짜 확인하기 →
        </Link>
        <p>날짜 확인만으로 예약이 확정되지는 않습니다.</p>
      </div>
    </main>
  );
}
