"use client";
import { useState } from "react";
import Link from "next/link";
import { tagColorDotClass } from "@/lib/product-tag-colors";
import { Camera, Clock, Users } from "lucide-react";
import { BookingSteps } from "./booking-shell";
import {
  cardRadiusClass,
  cardPaddingClass,
  nameTextClass,
  priceTextClass,
  saleBadgeBackground,
  type BookingStyle,
} from "@/lib/booking-style";

export type BookingProduct = {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  price: number;
  sale_price: number | null;
  duration_min: number;
  max_people: number | null;
  imageUrl: string | null;
  tag_color?: string | null;
};
export function BookingProducts({
  products,
  showThumbnails,
  style,
}: {
  products: BookingProduct[];
  showThumbnails: boolean;
  style: BookingStyle;
}) {
  const [filter, setFilter] = useState("all");
  const displayed = products.filter(
    (p) =>
      filter === "all" ||
      (filter === "solo" ? p.max_people === 1 : (p.max_people ?? 1) > 1),
  );
  return (
    <main className="booking-page">
      <BookingSteps stage="products" />
      <div className="border-border mb-6 border-b pb-6">
        <p className="text-brand mb-2 text-xs font-bold tracking-widest">
          BLUE N BLUE STUDIO
        </p>
        <h1 className="text-3xl font-bold">촬영 상품을 선택합니다</h1>
        <p className="text-muted mt-3 text-sm">
          상품의 구성과 가격을 확인하고 원하는 촬영을 신청합니다.
        </p>
      </div>
      {products.length > 0 ? (
        <>
          <div
            className="mb-5 flex flex-wrap gap-2"
            role="group"
            aria-label="촬영 인원 필터"
          >
            {[
              ["all", "전체 상품"],
              ["solo", "1인 촬영"],
              ["group", "그룹 촬영"],
            ].map(([key, label]) => (
              <button
                type="button"
                key={key}
                onClick={() => setFilter(key)}
                aria-pressed={filter === key}
                className={`rounded-md border px-4 py-2 text-sm ${filter === key ? "bg-brand border-brand text-white" : "bg-surface border-border"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {displayed.map((p) => (
              <BookingProductCard
                key={p.id}
                product={p}
                style={style}
                showThumbnails={showThumbnails}
              />
            ))}
          </ul>
          {displayed.length === 0 ? (
            <p className="text-muted py-12 text-center">
              이 조건에 맞는 상품이 없습니다.
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-muted py-12 text-center">
          현재 예약 가능한 상품이 없습니다. 곧 준비하겠습니다.
        </p>
      )}
      <div className="border-border bg-surface-subtle mt-8 flex flex-wrap items-center justify-between gap-4 rounded-md border p-6">
        <div>
          <h2 className="font-bold">이미 촬영을 신청하셨습니까?</h2>
          <p className="text-muted mt-1 text-sm">
            예약 상태와 희망 시간을 예약 조회에서 확인합니다.
          </p>
        </div>
        <Link
          href="/booking/lookup"
          className="border-border bg-surface rounded-md border px-4 py-3 text-sm font-semibold"
        >
          예약 조회하기 →
        </Link>
      </div>
    </main>
  );
}

/** 실제 상품 목록과 관리자 디자인 미리보기의 카드 구조를 함께 유지한다. */
export function BookingProductCard({
  product: p,
  style,
  showThumbnails,
}: {
  product: BookingProduct;
  style: BookingStyle;
  showThumbnails: boolean;
}) {
  return (
    <li
      className={`bg-surface border-border flex min-w-0 flex-col overflow-hidden border ${cardRadiusClass(style.cardRadius)}`}
    >
      {showThumbnails ? (
        p.imageUrl ? (
          <div className="h-40 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.imageUrl}
              alt={p.name}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div
            className="bg-surface-subtle text-brand/50 flex h-40 items-center justify-center"
            aria-hidden
          >
            <Camera size={64} strokeWidth={1} />
          </div>
        )
      ) : null}
      <div
        className={`flex flex-1 flex-col gap-4 ${cardPaddingClass(style.cardSize)}`}
      >
        <h2
          className={`font-bold ${nameTextClass(style.textSize)}`}
          style={{ color: style.textColor }}
        >
          {p.tag_color ? (
            <span
              className={`mr-2 inline-block h-2 w-2 rounded-full ${tagColorDotClass(p.tag_color)}`}
              aria-hidden
            />
          ) : null}
          {p.name}
        </h2>
        {p.summary ? (
          <p className="text-muted text-sm leading-relaxed">{p.summary}</p>
        ) : null}
        <div className="text-muted flex flex-wrap gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <Clock size={15} />
            {p.duration_min}분
          </span>
          {p.max_people ? (
            <span className="flex items-center gap-1.5">
              <Users size={15} />
              최대 {p.max_people}명
            </span>
          ) : null}
        </div>
        <div className="mt-auto pt-2">
          {p.sale_price != null ? (
            <div className="mb-1 flex items-center gap-2 text-xs">
              <span className="text-muted line-through">
                {p.price.toLocaleString()}원
              </span>
              <span
                className="rounded px-1.5 py-0.5 font-bold"
                style={{
                  color: style.saleColor,
                  backgroundColor: saleBadgeBackground(style.saleColor),
                }}
              >
                {p.price > 0
                  ? Math.round((1 - p.sale_price / p.price) * 100)
                  : 0}
                %
              </span>
            </div>
          ) : null}
          <p
            className={`font-extrabold ${priceTextClass(style.textSize)}`}
            style={{ color: style.textColor }}
          >
            {(p.sale_price ?? p.price).toLocaleString()}원
          </p>
        </div>
        <Link
          href={`/booking/${p.slug}`}
          className="bg-brand hover:bg-brand-hover mt-1 flex min-h-12 items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-bold text-white"
        >
          상세 보기 <span aria-hidden>→</span>
        </Link>
      </div>
    </li>
  );
}
